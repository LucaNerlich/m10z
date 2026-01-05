import {marked} from 'marked';
import {JSDOM} from 'jsdom';
import createDOMPurify from 'dompurify';

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

    try {
        // Marked output can include HTML; we sanitize after conversion.
        const rawHtml = marked.parse(markdownText, {
            gfm: true,
            breaks: true,
        }) as string;

        return DOMPurify.sanitize(rawHtml, {
            ALLOWED_TAGS,
            ALLOWED_ATTR,
            // Disallow data: and javascript: URLs; allow http(s) + mailto.
            ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
        });
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


