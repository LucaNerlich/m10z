import {describe, expect, test} from 'vitest';

import {absoluteRoute, routes} from './routes';

describe('routes', () => {
    test('static paths are German', () => {
        expect(routes.imprint).toBe('/impressum');
        expect(routes.privacy).toBe('/datenschutz');
        expect(routes.about).toBe('/ueber-uns');
        expect(routes.articles).toBe('/artikel');
        expect(routes.categories).toBe('/kategorien');
        expect(routes.authors).toBe('/team');
    });

    test('parameterized routes build the expected path', () => {
        expect(routes.article('my-slug')).toBe('/artikel/my-slug');
        expect(routes.podcast('ep-42')).toBe('/podcasts/ep-42');
        expect(routes.category('news')).toBe('/kategorien/news');
        expect(routes.author('luca')).toBe('/team/luca');
    });
});

describe('absoluteRoute', () => {
    test('relative path gets leading slash and is prefixed with siteUrl', () => {
        const result = absoluteRoute('artikel/foo');
        expect(result).toBe(`${routes.siteUrl}/artikel/foo`);
    });

    test('leading-slash path stays a single slash', () => {
        expect(absoluteRoute('/artikel/foo')).toBe(`${routes.siteUrl}/artikel/foo`);
    });

    test('empty path → siteUrl root', () => {
        expect(absoluteRoute('')).toBe(`${routes.siteUrl}/`);
    });

    test('http URL is returned unchanged', () => {
        expect(absoluteRoute('http://other.example/page')).toBe('http://other.example/page');
    });

    test('https URL is returned unchanged', () => {
        expect(absoluteRoute('https://other.example/page')).toBe('https://other.example/page');
    });
});
