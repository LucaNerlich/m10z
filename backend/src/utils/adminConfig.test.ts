import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {describe, expect, test} from 'vitest';

import createAdminConfig from '../../config/admin';

/**
 * Read a variable out of the documented template, so the test follows
 * `.env.example` instead of re-asserting a hardcoded string.
 */
function readDocumentedEnv(name: string): string | undefined {
    const contents = readFileSync(join(process.cwd(), '.env.example'), 'utf8');
    const line = contents.split('\n').find((entry) => entry.startsWith(`${name}=`));

    return line?.slice(name.length + 1);
}

/**
 * Minimal `env` mock matching Strapi's accessor: `env(key, fallback)` plus
 * `env.bool(key, fallback)`.
 */
function makeEnv(values: Record<string, unknown>) {
    const env = ((key: string, fallback?: unknown) => (key in values ? values[key] : fallback)) as {
        (key: string, fallback?: unknown): unknown;
        bool: (key: string, fallback?: boolean) => boolean;
    };
    env.bool = (key, fallback) => (key in values ? Boolean(values[key]) : (fallback ?? false));
    return env;
}

describe('config/admin cookie domain', () => {
    test('uses ADMIN_COOKIE_DOMAIN, not the BASE_DOMAIN origin URL', () => {
        // BASE_DOMAIN is an absolute origin (media URLs); the cookie needs a bare
        // host, so the two must not share a variable.
        const config = createAdminConfig({
            env: makeEnv({BASE_DOMAIN: 'https://cms.m10z.de', ADMIN_COOKIE_DOMAIN: 'cms.m10z.de'}),
        });

        expect(config.auth.cookie.domain).toBe('cms.m10z.de');
    });

    test('defaults to a host-only cookie when unset', () => {
        // The documented local value is empty: a Domain that is not a suffix of
        // the admin host (localhost:1337) is dropped by the browser.
        const config = createAdminConfig({env: makeEnv({})});

        expect(config.auth.cookie.domain).toBeUndefined();
    });

    test('treats an empty ADMIN_COOKIE_DOMAIN as host-only', () => {
        const config = createAdminConfig({env: makeEnv({ADMIN_COOKIE_DOMAIN: ''})});

        expect(config.auth.cookie.domain).toBeUndefined();
    });

    test('the documented ADMIN_COOKIE_DOMAIN is host-only or a suffix of the admin host', () => {
        // Read the template itself: a revert to a host that is not a suffix of
        // the documented admin host, or a URL-valued override, must fail here.
        const documentedDomain = readDocumentedEnv('ADMIN_COOKIE_DOMAIN');
        const config = createAdminConfig({
            env: makeEnv({ADMIN_COOKIE_DOMAIN: documentedDomain}),
        });

        if (!documentedDomain) {
            // Empty means "omit Domain": a host-only cookie, correct for local.
            expect(config.auth.cookie.domain).toBeUndefined();
            return;
        }

        const documentedHost = new URL(readDocumentedEnv('BASE_DOMAIN') ?? '').hostname;

        expect(config.auth.cookie.domain).toBe(documentedDomain);
        expect(documentedHost.endsWith(config.auth.cookie.domain as string)).toBe(true);
    });
});
