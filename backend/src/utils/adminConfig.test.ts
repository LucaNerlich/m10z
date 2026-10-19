import {describe, expect, test} from 'vitest';

import createAdminConfig from '../../config/admin';

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
});
