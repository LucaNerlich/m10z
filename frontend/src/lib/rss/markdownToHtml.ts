import {marked} from 'marked';
import {JSDOM} from 'jsdom';
import createDOMPurify from 'dompurify';

import {joinStrapiBaseUrl} from '@/src/lib/image';

/**
 * Markdown -> HTML renderer for RSS descriptions.
 *
 * We intentionally sanitize the resulting HTML before putting it into CDATA.
 * Marked does not sanitize output (see docs) so DOMPurify is required.
 *
 * Reference: [marked](https://github.com/markedjs/marked)
 */

/**
 * IMPORTANT: this module is used in long-lived feed schedulers.
 *
 * JSDOM windows should not be kept around indefinitely (resource accumulation / retained memory).
 * We therefore create a fresh JSDOM instance per conversion and always `close()` it in a finally block.
 */

let jsdomWindowsCreated = 0;
let jsdomWindowsClosed = 0;
let domPurifyInstancesCreated = 0;
let conversions = 0;
let lastConversionAtMs: number | null = null;
let lastErrorAtMs: number | null = null;

const ALLOWED_TAGS = [
    'a',
    'blockquote',
    'br',
    'code',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'img',
    'li',
    'ol',
    'p',
    'pre',
    'strong',
    'ul',
];

const ALLOWED_ATTR = [
    'alt',
    'height',
    'href',
    'loading',
    'rel',
    'sizes',
    'src',
    'srcset',
    'target',
    'title',
    'width',
];

/**
 * Resolve a sanitized URL for use inside feed HTML.
 *
 * Returns:
 * - the input unchanged for absolute http(s) URLs and mailto: links,
 * - the input unchanged for fragment-only anchors (#section),
 * - an absolute Strapi URL for relative paths (via `joinStrapiBaseUrl`),
 * - null when the URL is protocol-relative or relative without a configured
 *   Strapi base URL — callers must drop those attributes.
 */
function resolveFeedUrl(raw: string): string | null {
    if (raw.startsWith('//')) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^mailto:/i.test(raw)) return raw;
    if (raw.startsWith('#')) return raw;
    return joinStrapiBaseUrl(raw);
}

/**
 * Convert Markdown to sanitized HTML suitable for RSS descriptions.
 *
 * @param markdownText - The Markdown source to convert
 * @returns The sanitized HTML string produced from `markdownText`; returns an empty string if `markdownText` is falsy
 */
export function markdownToHtml(markdownText: string): string {
    if (!markdownText) return '';

    conversions += 1;
    lastConversionAtMs = Date.now();

    const dom = new JSDOM('');
    jsdomWindowsCreated += 1;
    const window = dom.window;

    // DOMPurify's TS types expect a WindowLike. JSDOM's window is compatible at runtime.
    // Cast to avoid type mismatch between DOMPurify and JSDOM type definitions.
    const DOMPurify = createDOMPurify(window as any);
    domPurifyInstancesCreated += 1;

    // Ensure every <a target="_blank"> gets rel="noopener noreferrer" to
    // prevent reverse tabnapping attacks in RSS reader UAs that honour the attribute.
    DOMPurify.addHook('afterSanitizeAttributes', (node: Element) => {
        if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
            node.setAttribute('rel', 'noopener noreferrer');
        }
    });

    try {
        // Marked output can include HTML; we sanitize after conversion.
        const rawHtml = marked.parse(markdownText, {
            gfm: true,
            breaks: true,
        }) as string;

        const sanitized = DOMPurify.sanitize(rawHtml, {
            ALLOWED_TAGS,
            ALLOWED_ATTR,
            // Disallow data: and javascript: URLs; allow http(s) + mailto.
            ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
        });

        // Rewrite URLs in the sanitized output:
        // - relative URLs (e.g. /uploads/foo.jpg) are absolutized against the
        //   Strapi base URL so feed readers resolve them correctly;
        // - protocol-relative URLs (//host/path) are removed — they would
        //   resolve against the reader's origin, pulling third-party content.
        const body = dom.window.document.body;
        body.innerHTML = sanitized;

        for (const img of Array.from(body.querySelectorAll('img[src]'))) {
            const src = img.getAttribute('src') ?? '';
            const resolved = resolveFeedUrl(src);
            if (resolved === null) img.removeAttribute('src');
            else img.setAttribute('src', resolved);
        }
        for (const img of Array.from(body.querySelectorAll('img[srcset]'))) {
            const srcset = img.getAttribute('srcset') ?? '';
            const resolvedSrcset = srcset
                .split(',')
                .map((candidate) => {
                    const [url, ...descriptors] = candidate.trim().split(/\s+/);
                    if (!url) return null;
                    const resolved = resolveFeedUrl(url);
                    return resolved === null ? null : [resolved, ...descriptors].join(' ');
                })
                .filter((candidate): candidate is string => candidate !== null)
                .join(', ');
            if (resolvedSrcset) img.setAttribute('srcset', resolvedSrcset);
            else img.removeAttribute('srcset');
        }
        for (const anchor of Array.from(body.querySelectorAll('a[href]'))) {
            const href = anchor.getAttribute('href') ?? '';
            const resolved = resolveFeedUrl(href);
            if (resolved === null) anchor.removeAttribute('href');
            else anchor.setAttribute('href', resolved);
        }

        return body.innerHTML;
    } catch (err) {
        lastErrorAtMs = Date.now();
        throw err;
    } finally {
        try {
            window.close();
            jsdomWindowsClosed += 1;
        } catch {
            // ignore
        }
    }
}

/**
 * Return a snapshot of internal telemetry and configuration for the Markdown-to-HTML converter.
 *
 * @returns An object containing:
 * - `conversions`: total number of conversions performed
 * - `lastConversionAtMs`: timestamp (ms) of the last successful conversion, or `undefined` if none
 * - `lastErrorAtMs`: timestamp (ms) of the last error during conversion, or `undefined` if none
 * - `jsdom.windowsCreated`: number of JSDOM windows created
 * - `jsdom.windowsClosed`: number of JSDOM windows closed
 * - `domPurify.instancesCreated`: number of DOMPurify instances created
 * - `marked.options`: the `gfm` and `breaks` options used for `marked`
 * - `sanitizer.allowedTagsCount`: number of allowed HTML tags in the sanitizer
 * - `sanitizer.allowedAttrCount`: number of allowed attributes in the sanitizer
 */
export function getMarkdownToHtmlState() {
    return {
        conversions,
        lastConversionAtMs,
        lastErrorAtMs,
        jsdom: {
            windowsCreated: jsdomWindowsCreated,
            windowsClosed: jsdomWindowsClosed,
        },
        domPurify: {
            instancesCreated: domPurifyInstancesCreated,
        },
        marked: {
            options: {
                gfm: true,
                breaks: true,
            },
        },
        sanitizer: {
            allowedTagsCount: ALLOWED_TAGS.length,
            allowedAttrCount: ALLOWED_ATTR.length,
        },
    };
}

