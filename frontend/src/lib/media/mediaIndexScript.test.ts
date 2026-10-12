import {execFile} from 'node:child_process';
import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises';
import {createServer, type ServerResponse} from 'node:http';
import {type AddressInfo} from 'node:net';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';

import {describe, expect, it} from 'vitest';

import {parseMediaIndex} from '@/src/lib/media/mediaIndex';

const execFileAsync = promisify(execFile);

function scriptEnv(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
    const env = {...process.env};
    delete env.STRAPI_MCP_URL;
    delete env.STRAPI_MCP_TOKEN;
    delete env.STRAPI_MCP_ADMIN_TOKEN_LOCAL;
    delete env.STRAPI_MCP_ADMIN_TOKEN_PROD;
    return {...env, ...overrides};
}

function runScript(
    env: NodeJS.ProcessEnv,
    args: string[] = []
): Promise<{stdout: string; stderr: string}> {
    return execFileAsync(
        process.execPath,
        ['--import', 'tsx', 'scripts/media-index.ts', ...args],
        {
            cwd: process.cwd(),
            env,
            timeout: 10_000,
        }
    );
}

type Asset = {
    url?: string | null;
    alternativeText?: string | null;
    caption?: string | null;
};

async function withMockMcp(
    assets: Asset[],
    run: (url: string, outFile: string) => Promise<void>
): Promise<void> {
    const server = createServer(async (request, response: ServerResponse) => {
        const body = await new Promise<string>((resolve) => {
            const chunks: Buffer[] = [];
            request.on('data', (chunk: Buffer) => chunks.push(chunk));
            request.on('end', () =>
                resolve(Buffer.concat(chunks).toString('utf8'))
            );
        });
        const rpc = JSON.parse(body) as {id: number; params: {name: string}};
        response.setHeader('content-type', 'application/json');
        response.end(
            JSON.stringify({
                jsonrpc: '2.0',
                id: rpc.id,
                result: {
                    structuredContent: {
                        results: assets,
                        pagination: {
                            page: 1,
                            pageSize: 100,
                            pageCount: 1,
                            total: assets.length,
                        },
                    },
                },
            })
        );
    });
    await new Promise<void>((resolve) =>
        server.listen(0, '127.0.0.1', resolve)
    );
    const address = server.address() as AddressInfo;
    const directory = await mkdtemp(path.join(tmpdir(), 'media-index-test-'));
    try {
        await run(
            `http://127.0.0.1:${address.port}/mcp`,
            path.join(directory, 'media-index.json')
        );
    } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
        await rm(directory, {recursive: true, force: true});
    }
}

describe('media index script', () => {
    it('rejects remote HTTP and local HTTP without a local token before fetching', async () => {
        await expect(
            runScript(
                scriptEnv({
                    STRAPI_MCP_URL: 'http://example.com/mcp',
                    STRAPI_MCP_ADMIN_TOKEN_PROD: 'prod-token',
                })
            )
        ).rejects.toMatchObject({
            stderr: expect.stringContaining('MCP endpoint must use HTTPS'),
        });
        await expect(
            runScript(scriptEnv({STRAPI_MCP_URL: 'https://example.com/mcp'}))
        ).rejects.toMatchObject({
            stderr: expect.stringContaining('Missing MCP token'),
        });
    });

    it('writes a sorted, validated index with only assets that carry metadata', async () => {
        await withMockMcp(
            [
                {
                    url: '/uploads/b_2.jpg',
                    alternativeText: null,
                    caption: 'B capture',
                },
                {
                    url: '/uploads/a_1.jpg',
                    alternativeText: 'A alt',
                    caption: null,
                },
                {url: '/uploads/c_3.jpg', alternativeText: null, caption: null},
                {url: null, alternativeText: 'no url', caption: 'no url'},
            ],
            async (url, outFile) => {
                await runScript(
                    scriptEnv({
                        STRAPI_MCP_URL: url,
                        STRAPI_MCP_ADMIN_TOKEN_LOCAL: 'local-token',
                        MEDIA_INDEX_OUT: outFile,
                    })
                );
                const index = parseMediaIndex(await readFile(outFile, 'utf8'));
                expect(Object.keys(index.entries)).toEqual([
                    'uploads/a_1.jpg',
                    'uploads/b_2.jpg',
                ]);
                expect(index.baseUrl).toBe(url.replace('/mcp', ''));
                expect(index.entries['uploads/a_1.jpg']).toEqual({
                    alt: 'A alt',
                    caption: undefined,
                });
                expect(await readdir(path.dirname(outFile))).toEqual([
                    'media-index.json',
                ]);
            }
        );
    });

    it('writes nothing in a dry run', async () => {
        await withMockMcp(
            [
                {
                    url: '/uploads/a_1.jpg',
                    alternativeText: 'A alt',
                    caption: null,
                },
            ],
            async (url, outFile) => {
                await runScript(
                    scriptEnv({
                        STRAPI_MCP_URL: url,
                        STRAPI_MCP_ADMIN_TOKEN_LOCAL: 'local-token',
                        MEDIA_INDEX_OUT: outFile,
                    }),
                    ['--dry-run']
                );
                expect(await readdir(path.dirname(outFile))).toEqual([]);
            }
        );
    });
});
