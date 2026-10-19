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

    test('defaults to the real admin host when unset', () => {
        const config = createAdminConfig({env: makeEnv({})});

        expect(config.auth.cookie.domain).toBe('cms.m10z.de');
    });

    test('the documented cookie domain is a suffix of the documented admin host', () => {
        // .env.example documents cms.m10z.de as both the CMS origin host and the
        // ADMIN_COOKIE_DOMAIN; a Set-Cookie Domain must be a suffix of the host.
        const config = createAdminConfig({env: makeEnv({})});
        const host = 'cms.m10z.de';

        expect(host.endsWith(config.auth.cookie.domain as string)).toBe(true);
    });
});
