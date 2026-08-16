import {describe, expect, test, vi} from 'vitest';

import {getMarkdownToHtmlState, markdownToHtml} from './markdownToHtml';

describe('markdownToHtml — rendering', () => {
    test('returns an empty string for falsy input', () => {
        expect(markdownToHtml('')).toBe('');
    });

    test('renders basic markdown to HTML', () => {
        const html = markdownToHtml('Hello **world**');
        expect(html).toContain('<strong>world</strong>');
        expect(html).toContain('<p>');
    });

    test('keeps allowed links with safe http(s) hrefs', () => {
        const html = markdownToHtml('[M10Z](https://m10z.de)');
        expect(html).toContain('href="https://m10z.de"');
    });
});

describe('markdownToHtml — sanitization (XSS)', () => {
    test('strips <script> tags entirely', () => {
        const html = markdownToHtml('ok\n\n<script>alert(1)</script>');
        expect(html).not.toContain('<script');
        expect(html).not.toContain('alert(1)');
    });

    test('neutralizes javascript: URLs in links', () => {
        const html = markdownToHtml('[click](javascript:alert(1))');
        expect(html.toLowerCase()).not.toContain('javascript:');
    });

    test('removes disallowed tags such as <iframe>', () => {
        const html = markdownToHtml('<iframe src="https://evil.test"></iframe>');
        expect(html).not.toContain('<iframe');
    });

    test('drops inline event-handler attributes', () => {
        const html = markdownToHtml('<img src="x" onerror="alert(1)">');
        expect(html).not.toContain('onerror');
    });
});

describe('markdownToHtml — rel=noopener injection', () => {
    test('adds rel="noopener noreferrer" to <a target="_blank"> links', () => {
        const html = markdownToHtml('<a href="https://example.com" target="_blank">link</a>');
        expect(html).toContain('rel="noopener noreferrer"');
        expect(html).toContain('target="_blank"');
        expect(html).toContain('href="https://example.com"');
    });

    test('does not add rel to links without target="_blank"', () => {
        const html = markdownToHtml('[M10Z](https://m10z.de)');
        expect(html).not.toContain('noopener');
    });
});

describe('markdownToHtml — URL resolution for feed readers', () => {
    test('absolutizes relative image src against the Strapi base URL', () => {
        vi.stubEnv('STRAPI_URL', 'https://cms.m10z.de');
        const html = markdownToHtml('![alt](/uploads/foo.jpg)');
        expect(html).toContain('src="https://cms.m10z.de/uploads/foo.jpg"');
        vi.unstubAllEnvs();
    });

    test('absolutizes every candidate in a relative srcset', () => {
        vi.stubEnv('STRAPI_URL', 'https://cms.m10z.de');
        const html = markdownToHtml('<img srcset="/uploads/a.jpg 480w, /uploads/b.jpg 800w">');
        expect(html).toContain('srcset="https://cms.m10z.de/uploads/a.jpg 480w, https://cms.m10z.de/uploads/b.jpg 800w"');
        vi.unstubAllEnvs();
    });

    test('drops protocol-relative URLs from links and images', () => {
        vi.stubEnv('STRAPI_URL', 'https://cms.m10z.de');
        const html = markdownToHtml('[x](//evil.test/path) <img src="//evil.test/i.png">');
        expect(html).not.toContain('//evil.test');
        vi.unstubAllEnvs();
    });

    test('absolutizes relative link hrefs', () => {
        vi.stubEnv('STRAPI_URL', 'https://cms.m10z.de');
        const html = markdownToHtml('[doc](/uploads/doc.pdf)');
        expect(html).toContain('href="https://cms.m10z.de/uploads/doc.pdf"');
        vi.unstubAllEnvs();
    });

    test('keeps fragment-only anchors unchanged', () => {
        vi.stubEnv('STRAPI_URL', 'https://cms.m10z.de');
        const html = markdownToHtml('[x](#section)');
        expect(html).toContain('href="#section"');
        vi.unstubAllEnvs();
    });

    test('drops relative URLs when no Strapi base URL is configured', () => {
        const html = markdownToHtml('<img src="/uploads/foo.jpg">');
        expect(html).not.toContain('src="/uploads');
    });
});

describe('getMarkdownToHtmlState', () => {
    test('reports a non-empty allow-list and increments conversion telemetry', () => {
        const before = getMarkdownToHtmlState().conversions;
        markdownToHtml('telemetry check');
        const after = getMarkdownToHtmlState();
        expect(after.conversions).toBe(before + 1);
        expect(after.sanitizer.allowedTagsCount).toBeGreaterThan(0);
        expect(after.sanitizer.allowedAttrCount).toBeGreaterThan(0);
        // Each conversion must close the JSDOM window it opened.
        expect(after.jsdom.windowsClosed).toBe(after.jsdom.windowsCreated);
    });
});
