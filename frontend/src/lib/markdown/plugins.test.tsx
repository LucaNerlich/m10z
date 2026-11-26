import ReactMarkdown from 'react-markdown';
import {renderToStaticMarkup} from 'react-dom/server';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import {describe, expect, test} from 'vitest';

import {REHYPE_SANITIZE_SCHEMA} from './plugins';
import {markdownUrlTransform} from './urlTransform';

// Mirrors the sanitize-relevant part of the Markdown component's pipeline:
// raw HTML is parsed (rehype-raw) and then sanitized with the exported schema.
function render(markdown: string): string {
    return renderToStaticMarkup(
        <ReactMarkdown
            urlTransform={markdownUrlTransform}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, [rehypeSanitize, REHYPE_SANITIZE_SCHEMA]]}
        >
            {markdown}
        </ReactMarkdown>,
    );
}

describe('REHYPE_SANITIZE_SCHEMA', () => {
    test('keeps data-* attributes on anchors', () => {
        const html = render('<a href="https://example.com" data-umami-event="click:cta">Link</a>');

        expect(html).toContain('data-umami-event="click:cta"');
        expect(html).toContain('href="https://example.com"');
    });

    test('keeps tel: hrefs so the phone link stays usable', () => {
        // Without `tel` in the protocol allow-list the href is dropped and the
        // anchor in the Impressum renders as inert text.
        expect(render('[Anrufen](tel:+4912345)')).toContain('href="tel:+4912345"');
    });

    test('keeps the GFM footnote section attributes the default schema grants', () => {
        const html = render('Text[^1]\n\n[^1]: note');

        expect(html).toContain('data-footnotes');
        expect(html).toContain('class="footnotes"');
    });
});
