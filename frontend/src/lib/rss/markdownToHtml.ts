import { marked } from 'marked';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

/**
 * Markdown -> HTML renderer for RSS descriptions.
 *
 * We intentionally sanitize the resulting HTML before putting it into CDATA.
 * Marked does not sanitize output (see docs) so DOMPurify is required.
 *
 * Reference: [marked](https://github.com/markedjs/marked)
 */

const window = new JSDOM('').window;
// DOMPurify's TS types expect a WindowLike. JSDOM's window is compatible at runtime.
// Cast to avoid type mismatch between DOMPurify and JSDOM type definitions.
const DOMPurify = createDOMPurify(window as any);

const ALLOWED_TAGS = [
  'a',
  'p',
  'br',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'code',
  'pre',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
];

const ALLOWED_ATTR = ['href', 'title', 'rel', 'target'];

export function markdownToHtml(markdownText: string): string {
  if (!markdownText) return '';

  // Marked output can include HTML; we sanitize after conversion.
  const rawHtml = marked.parse(markdownText, {
    gfm: true,
    breaks: true,
  }) as string;

  const clean = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Disallow data: and javascript: URLs; allow http(s) + mailto.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  });

  return clean;
}


