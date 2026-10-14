import {beforeEach, describe, expect, test, vi} from 'vitest';

let hostHeader = '';

vi.mock('next/headers', () => ({
    headers: async () => new Headers(hostHeader ? {host: hostHeader} : {}),
}));

const robots = (await import('./robots')).default;

beforeEach(() => {
    hostHeader = '';
    vi.unstubAllEnvs();
});

/** Run `robots()` for a host, returning the disallow list ([] when indexable). */
async function disallowFor(host: string, noindexHosts: string): Promise<string[]> {
    hostHeader = host;
    vi.stubEnv('NOINDEX_HOSTS', noindexHosts);

    const result = await robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    return rules.flatMap((rule) => {
        const disallow = rule?.disallow;
        return Array.isArray(disallow) ? disallow : disallow ? [disallow] : [];
    });
}

describe('robots noindex host matching', () => {
    test('deindexes the configured host exactly', async () => {
        expect(await disallowFor('example.com', 'example.com')).toContain('/');
    });

    test('does not deindex a host that merely contains the entry', async () => {
        // The old substring check matched this, silently deindexing a production host.
        expect(await disallowFor('notexample.com', 'example.com')).not.toContain('/');
        expect(await disallowFor('m10z.de.evil.com', 'm10z.de')).not.toContain('/');
    });

    test('treats a configured host as a label boundary, so subdomains match', async () => {
        expect(await disallowFor('beta.m10z.de', 'm10z.de')).toContain('/');
    });

    test('ignores the port when matching', async () => {
        expect(await disallowFor('localhost:3000', 'localhost')).toContain('/');
    });

    test('indexes an unlisted host and still emits the sitemap', async () => {
        hostHeader = 'm10z.de';
        vi.stubEnv('NOINDEX_HOSTS', 'localhost,127.0.0.1');

        const result = await robots();
        const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
        expect(rules[0]?.disallow).toEqual(['/api/', '/preview/']);
        expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
    });
});
