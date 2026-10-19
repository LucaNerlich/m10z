import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkSmartypants from 'remark-smartypants';
import {unified} from 'unified';

import {joinStrapiBaseUrl} from '@/src/lib/image';
import {preprocessMarkdown} from '@/src/lib/markdown/preprocess';
import {REHYPE_SANITIZE_SCHEMA, REMARK_REHYPE_OPTIONS} from '@/src/lib/markdown/plugins';

/**
 * Markdown -> sanitized HTML renderer for RSS descriptions.
 *
 * Uses the same remark/rehype chain and sanitize schema as the on-site
 * `Markdown` component, so GFM footnotes, tables, strikethrough, and the
 * custom inline tags render the same way in feeds. The previous second
 * renderer (`marked` + a hand-written allowlist + DOMPurify/JSDOM) is gone.
 *
 * The pipeline is synchronous and allocates no DOM window, which matters in
 * the long-lived feed builders.
 */

let conversions = 0;
let lastConversionAtMs: number | null = null;
let lastErrorAtMs: number | null = null;

type HastNode = {
    type: string;
    tagName?: string;
    properties?: Record<string, unknown>;
    children?: HastNode[];
    value?: string;
};

/**
 * Images are CMS assets: relative paths belong to the Strapi origin.
 */
function resolveAssetUrl(raw: string): string | null {
    if (raw.startsWith('//')) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^mailto:/i.test(raw)) return raw;
    if (raw.startsWith('#')) return raw;
    return joinStrapiBaseUrl(raw);
}

/**
 * Internal links are site-relative and belong to the public origin. Uploads
 * stay on the CMS, as do relative paths when no site URL is available.
 */
function resolveLinkUrl(raw: string, siteUrl: string | undefined): string | null {
    if (raw.startsWith('//')) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^mailto:/i.test(raw)) return raw;
    if (raw.startsWith('#')) return raw;
    if (raw.startsWith('/uploads/') || !siteUrl) return joinStrapiBaseUrl(raw);
    const url = new URL(raw, siteUrl);
    // Backslashes normalize to slashes in URL parsing (`/\evil.test` would
    // escape the site origin), so enforce same-origin after parsing.
    return url.origin === new URL(siteUrl).origin ? url.toString() : null;
}

function walkHast(node: HastNode, visit: (node: HastNode) => void): void {
    visit(node);
    for (const child of node.children ?? []) walkHast(child, visit);
}

function resolveSrcset(value: string): string {
    return value
        .split(',')
        .map((candidate) => {
            const [url, ...descriptors] = candidate.trim().split(/\s+/);
            if (!url) return null;
            const resolved = resolveAssetUrl(url);
            return resolved === null ? null : [resolved, ...descriptors].join(' ');
        })
        .filter((candidate): candidate is string => candidate !== null)
        .join(', ');
}

/**
 * Rewrite href/src/srcset in the hast tree before sanitization, so the output
 * passes the sanitizer's URI rules and feed readers resolve every URL.
 */
function rehypeResolveFeedUrls(options: {siteUrl?: string}) {
    return (tree: HastNode): void => {
        walkHast(tree, (node) => {
            if (node.type !== 'element' || !node.properties) return;
            if (node.tagName === 'img') {
                const src = node.properties.src;
                if (typeof src === 'string') {
                    const resolved = resolveAssetUrl(src);
                    if (resolved === null) delete node.properties.src;
                    else node.properties.src = resolved;
                }
                const srcSet = node.properties.srcSet;
                if (typeof srcSet === 'string') {
                    const resolved = resolveSrcset(srcSet);
                    if (resolved) node.properties.srcSet = resolved;
                    else delete node.properties.srcSet;
                }
            } else if (node.tagName === 'a') {
                const href = node.properties.href;
                if (typeof href === 'string') {
                    const resolved = resolveLinkUrl(href, options.siteUrl);
                    if (resolved === null) delete node.properties.href;
                    else node.properties.href = resolved;
                }
                // Same reverse-tabnabbing guard the old DOMPurify hook provided.
                if (node.properties.target === '_blank') {
                    node.properties.rel = 'noopener noreferrer';
                }
            }
        });
    };
}

/**
 * Convert Markdown to sanitized HTML suitable for RSS descriptions.
 *
 * @param markdownText - The Markdown source to convert
 * @param siteUrl - Public site origin used to resolve internal links (e.g. `https://m10z.de`)
 * @returns The sanitized HTML string produced from `markdownText`; returns an empty string if `markdownText` is falsy
 */
export function markdownToHtml(markdownText: string, siteUrl?: string): string {
    if (!markdownText) return '';

    conversions += 1;
    lastConversionAtMs = Date.now();

    try {
        const processor = unified()
            .use(remarkParse)
            .use(remarkBreaks)
            .use(remarkGfm)
            .use(remarkSmartypants)
            .use(remarkRehype, {...REMARK_REHYPE_OPTIONS, allowDangerousHtml: true})
            .use(rehypeRaw)
            .use(rehypeResolveFeedUrls, {siteUrl})
            .use(rehypeSanitize, REHYPE_SANITIZE_SCHEMA)
            .use(rehypeStringify);
        return String(processor.processSync(preprocessMarkdown(markdownText)));
    } catch (err) {
        lastErrorAtMs = Date.now();
        throw err;
    }
}

/**
 * Return a snapshot of internal telemetry and configuration for the Markdown-to-HTML converter.
 */
export function getMarkdownToHtmlState() {
    return {
        conversions,
        lastConversionAtMs,
        lastErrorAtMs,
        renderer: {
            engine: 'remark/rehype',
            remarkPlugins: ['remark-parse', 'remark-breaks', 'remark-gfm', 'remark-smartypants'],
            rehypePlugins: [
                'rehype-raw',
                'rehype-resolve-feed-urls',
                'rehype-sanitize',
                'rehype-stringify',
            ],
        },
        sanitizer: {
            allowedTagsCount: REHYPE_SANITIZE_SCHEMA.tagNames?.length ?? 0,
            allowedAttrCount: Object.values(REHYPE_SANITIZE_SCHEMA.attributes ?? {}).reduce(
                (count, list) => count + list.length,
                0,
            ),
        },
    };
}
