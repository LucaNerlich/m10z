import {describe, expect, test, vi} from 'vitest';

import {
    createMcpTransport,
    resolveMcpConfig,
} from './shared/contracts/mcp/transport';

describe('resolveMcpConfig', () => {
    test('allows HTTPS with the production token', () => {
        const config = resolveMcpConfig({
            env: {
                STRAPI_MCP_ADMIN_TOKEN_PROD: 'prod-token',
            },
        });

        expect(config.endpoint).toBe('https://cms.m10z.de/mcp');
        expect(config.origin).toBe('https://cms.m10z.de');
        expect(config.token).toBe('prod-token');
    });

    test('allows plain HTTP on localhost with the local token', () => {
        const config = resolveMcpConfig({
            useLocal: true,
            env: {
                STRAPI_MCP_ADMIN_TOKEN_LOCAL: 'local-token',
            },
        });

        expect(config.endpoint).toBe('http://localhost:1337/mcp');
        expect(config.localHttp).toBe(true);
        expect(config.token).toBe('local-token');
    });

    test('rejects a non-local token on plain HTTP', () => {
        expect(() =>
            resolveMcpConfig({
                useLocal: true,
                env: {
                    STRAPI_MCP_ADMIN_TOKEN_LOCAL: 'local-token',
                    STRAPI_MCP_TOKEN: 'prod-token',
                },
            })
        ).toThrow(/HTTPS/);
    });

    test('rejects plain HTTP without a local token', () => {
        expect(() =>
            resolveMcpConfig({
                useLocal: true,
                env: {
                    STRAPI_MCP_ADMIN_TOKEN_PROD: 'prod-token',
                },
            })
        ).toThrow(/HTTPS/);
    });

    test('rejects a non-HTTPS remote endpoint even with a token', () => {
        expect(() =>
            resolveMcpConfig({
                env: {
                    STRAPI_MCP_URL: 'http://cms.example.test/mcp',
                    STRAPI_MCP_TOKEN: 'prod-token',
                },
            })
        ).toThrow(/HTTPS/);
    });

    test('throws when no token is available', () => {
        expect(() => resolveMcpConfig({env: {}})).toThrow(/Missing MCP token/);
    });
});

describe('createMcpTransport', () => {
    test('parses a plain JSON-RPC response', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({result: {structuredContent: {ok: true}}}),
                {
                    status: 200,
                    headers: {'content-type': 'application/json'},
                }
            )
        );
        vi.stubGlobal('fetch', fetchMock);

        const transport = createMcpTransport({
            endpoint: 'https://cms.m10z.de/mcp',
            token: 't',
        });
        await expect(
            transport.callTool('media_list_assets', {page: 1})
        ).resolves.toEqual({ok: true});

        vi.unstubAllGlobals();
    });

    test('retries transient failures and reports each retry', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(new Response('boom', {status: 503}))
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({result: {structuredContent: {ok: true}}}),
                    {
                        status: 200,
                        headers: {'content-type': 'application/json'},
                    }
                )
            );
        vi.stubGlobal('fetch', fetchMock);
        const onRetry = vi.fn();

        const transport = createMcpTransport(
            {endpoint: 'https://cms.m10z.de/mcp', token: 't'},
            {retry: {attempts: 2, baseDelayMs: 1, onRetry}}
        );
        await expect(
            transport.callTool('media_list_assets', {})
        ).resolves.toEqual({ok: true});
        expect(onRetry).toHaveBeenCalledTimes(1);
        expect(onRetry).toHaveBeenCalledWith(
            expect.anything(),
            1,
            'media_list_assets'
        );
        expect(fetchMock).toHaveBeenCalledTimes(2);

        vi.unstubAllGlobals();
    });
});
