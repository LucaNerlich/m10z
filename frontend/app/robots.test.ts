import {beforeEach, describe, expect, test, vi} from 'vitest';

let requestHeaders: Record<string, string> = {};

vi.mock('next/headers', () => ({
    headers: async () => new Headers(requestHeaders),
}));

const robots = (await import('./robots')).default;

beforeEach(() => {
    requestHeaders = {};
    vi.unstubAllEnvs();
});

/** Run `robots()` for a set of request headers, returning the disallow list ([] when indexable). */
async function disallowForHeaders(headers: Record<string, string>, noindexHosts: string): Promise<string[]> {
    requestHeaders = headers;
    vi.stubEnv('NOINDEX_HOSTS', noindexHosts);

    const result = await robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    return rules.flatMap((rule) => {
        const disallow = rule?.disallow;
        return Array.isArray(disallow) ? disallow : disallow ? [disallow] : [];
    });
}

/** Run `robots()` for a `host` header, returning the disallow list ([] when indexable). */
async function disallowFor(host: string, noindexHosts: string): Promise<string[]> {
    return disallowForHeaders({host}, noindexHosts);
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
        requestHeaders = {host: 'm10z.de'};
        vi.stubEnv('NOINDEX_HOSTS', 'localhost,127.0.0.1');

        const result = await robots();
        const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
        expect(rules[0]?.disallow).toEqual(['/api/', '/preview/']);
        expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
    });

    test('deindexes when any hop of a multi-hop x-forwarded-host matches', async () => {
        // A client-supplied `m10z.de` joined with the real `next.m10z.de`: the
        // staging host still matches, so the noindex rule cannot be switched off.
        expect(
            await disallowForHeaders({'x-forwarded-host': 'm10z.de, next.m10z.de'}, 'next.m10z.de'),
        ).toContain('/');
    });

    test('deindexes a single-hop x-forwarded-host spoof', async () => {
        // #1013's reproduction: a staging request whose client-supplied
        // x-forwarded-host names the production host. The `host` header still
        // says next.m10z.de, so the staging noindex rule must win.
        expect(
            await disallowForHeaders({host: 'next.m10z.de', 'x-forwarded-host': 'm10z.de'}, 'next.m10z.de'),
        ).toContain('/');
    });

    test('a single x-forwarded-host on the production host stays indexable', async () => {
        requestHeaders = {'x-forwarded-host': 'm10z.de'};
        vi.stubEnv('NOINDEX_HOSTS', 'localhost,127.0.0.1');

        const result = await robots();
        const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
        expect(rules[0]?.disallow).toEqual(['/api/', '/preview/']);
        expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
    });
});
