import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, test} from 'vitest';

import {type BlogPosting} from '@/src/lib/jsonld/types';

import {JsonLdScripts} from './JsonLdScripts';

function posting(headline: string): BlogPosting {
    return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline,
        url: 'https://m10z.de/artikel/test',
        publisher: {'@context': 'https://schema.org', '@type': 'Organization', name: 'M10Z', url: 'https://m10z.de'},
    };
}

describe('JsonLdScripts', () => {
    test('renders the JSON-LD payload into the server-rendered HTML', () => {
        const html = renderToStaticMarkup(
            <JsonLdScripts entries={[{id: 'jsonld-article-test', jsonLd: posting('Server-rendered headline')}]} />,
        );

        expect(html).toContain('type="application/ld+json"');
        expect(html).toContain('id="jsonld-article-test"');
        // The payload itself must be present before any client hydration.
        expect(html).toContain('Server-rendered headline');
        expect(html).toContain('"@type":"BlogPosting"');
    });

    test('renders one script per entry', () => {
        const html = renderToStaticMarkup(
            <JsonLdScripts
                entries={[
                    {id: 'jsonld-article-test', jsonLd: posting('One')},
                    {id: 'jsonld-breadcrumb-test', jsonLd: posting('Two')},
                ]}
            />,
        );

        expect(html.match(/type="application\/ld\+json"/g)).toHaveLength(2);
    });

    test('escapes a payload containing a closing script tag', () => {
        const html = renderToStaticMarkup(
            <JsonLdScripts
                entries={[{id: 'jsonld-article-xss', jsonLd: posting('</script><script>alert(1)</script>')}]}
            />,
        );

        // serialize-javascript escapes `<` (and `/`), so the tag cannot break out.
        expect(html).not.toContain('</script><script>');
        expect(html).toContain('\\u003C\\u002Fscript');
    });
});
