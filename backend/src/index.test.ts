import {afterEach, describe, expect, test, vi} from 'vitest';

import plugin from './index';

const REQUIRED_ENV: Record<string, string> = {
    DATABASE_CLIENT: 'postgres',
    DATABASE_HOST: 'localhost',
    DATABASE_PORT: '5432',
    DATABASE_NAME: 'm10z',
    DATABASE_USERNAME: 'strapi',
    DATABASE_PASSWORD: 'secret',
    ADMIN_JWT_SECRET: 'admin',
    API_TOKEN_SALT: 'salt',
    STRAPI_PREVIEW_SECRET: 'preview',
    BASE_DOMAIN: 'https://cms.example.test',
};

function registerWith(overrides: Record<string, string | undefined>): void {
    const env = {...REQUIRED_ENV, ...overrides};
    for (const [name, value] of Object.entries(env)) {
        vi.stubEnv(name, value);
    }

    const strapi = {
        log: {error: vi.fn(), warn: vi.fn(), info: vi.fn()},
        server: {httpServer: {}},
        // The upload plugin is absent in this stub, so the schema extension is skipped.
        plugin: () => undefined,
        db: {lifecycle: vi.fn()},
        // Strapi's document service is callable and also exposes `.use`.
        documents: Object.assign(() => ({}), {use: vi.fn()}),
    } as unknown as Parameters<typeof plugin.register>[0]['strapi'];

    // Throws before touching strapi.server, so a fake instance is enough.
    plugin.register({strapi});
}

describe('production boot guard', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    test('rejects a missing invalidation secret', () => {
        vi.stubEnv('NODE_ENV', 'production');

        expect(() =>
            registerWith({
                FRONTEND_URL: 'https://m10z.de',
                STRAPI_INVALIDATION_SECRET: undefined,
            })
        ).toThrow(/STRAPI_INVALIDATION_SECRET/);
    });

    test('rejects a whitespace-only invalidation secret', () => {
        // It would pass a presence check and then be sent as the header value.
        vi.stubEnv('NODE_ENV', 'production');

        expect(() =>
            registerWith({
                FRONTEND_URL: 'https://m10z.de',
                STRAPI_INVALIDATION_SECRET: '   ',
            })
        ).toThrow(/STRAPI_INVALIDATION_SECRET/);
    });

    test('rejects a missing FRONTEND_URL', () => {
        vi.stubEnv('NODE_ENV', 'production');

        expect(() =>
            registerWith({
                FRONTEND_URL: undefined,
                STRAPI_INVALIDATION_SECRET: 'secret',
            })
        ).toThrow(/FRONTEND_URL/);
    });

    test('rejects a plaintext FRONTEND_URL', () => {
        // The header carries the invalidation secret; the queue would swallow the
        // runtime throw, so the boot has to fail.
        vi.stubEnv('NODE_ENV', 'production');

        expect(() =>
            registerWith({
                FRONTEND_URL: 'http://m10z.de',
                STRAPI_INVALIDATION_SECRET: 'secret',
            })
        ).toThrow(/FRONTEND_URL/);
    });

    test('accepts an https FRONTEND_URL', () => {
        vi.stubEnv('NODE_ENV', 'production');

        expect(() =>
            registerWith({
                FRONTEND_URL: 'https://m10z.de',
                STRAPI_INVALIDATION_SECRET: 'secret',
            })
        ).not.toThrow();
    });

    test('keeps both variables optional outside production', () => {
        vi.stubEnv('NODE_ENV', 'test');

        expect(() =>
            registerWith({FRONTEND_URL: undefined, STRAPI_INVALIDATION_SECRET: undefined})
        ).not.toThrow();
    });
});

describe('destroy lifecycle', () => {
    test('drains the HTTP server before Strapi tears it down', async () => {
        const close = vi.fn((callback: (err?: Error) => void) => callback());
        const closeIdleConnections = vi.fn();
        const log = {info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn()};
        const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

        try {
            await plugin.destroy({
                strapi: {log, server: {httpServer: {close, closeIdleConnections}}} as never,
            });

            expect(close).toHaveBeenCalledTimes(1);
            // Strapi exits after destroy resolves, so the drain must not.
            expect(exit).not.toHaveBeenCalled();
        } finally {
            exit.mockRestore();
        }
    });
});
