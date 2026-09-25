import {execFile} from 'node:child_process';
import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises';
import {createServer, type ServerResponse} from 'node:http';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {type AddressInfo} from 'node:net';
import {promisify} from 'node:util';

import {describe, expect, it} from 'vitest';

import {parseStatistikSnapshot} from '@/src/lib/statistik/snapshot';

const execFileAsync = promisify(execFile);

function scriptEnv(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
    const env = {...process.env};
    delete env.STRAPI_MCP_URL;
    delete env.STRAPI_MCP_TOKEN;
    delete env.STRAPI_MCP_ADMIN_TOKEN_LOCAL;
    delete env.STRAPI_MCP_ADMIN_TOKEN_PROD;
    return {...env, ...overrides};
}

function runScript(env: NodeJS.ProcessEnv, args: string[] = []): Promise<{stdout: string; stderr: string}> {
    return execFileAsync(process.execPath, ['--import', 'tsx', 'scripts/statistik-snapshot.ts', ...args], {
        cwd: process.cwd(),
        env,
        timeout: 10_000,
    });
}

function sendRpc(response: ServerResponse, id: number, results: unknown[], pageCount?: number): void {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({jsonrpc: '2.0', id, result: {structuredContent: {
        results,
        ...(pageCount === undefined ? {} : {pagination: {page: 1, pageSize: 100, pageCount, total: results.length}}),
    }}}));
}

function article(index: number): Record<string, unknown> {
    return {documentId: `a${index}`, slug: `a${index}`, title: `Article ${index}`, date: '2024-01-01T00:00:00Z'};
}

async function withMockMcp(
    handler: (name: string, page: number, id: number, response: ServerResponse) => void,
    run: (url: string, outFile: string) => Promise<void>,
): Promise<void> {
    const server = createServer(async (request, response) => {
        const body = await new Promise<string>((resolve) => {
            const chunks: Buffer[] = [];
            request.on('data', (chunk: Buffer) => chunks.push(chunk));
            request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        });
        const rpc = JSON.parse(body) as {id: number; params: {name: string; arguments: {page: number}}};
        handler(rpc.params.name, rpc.params.arguments.page, rpc.id, response);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    const directory = await mkdtemp(path.join(tmpdir(), 'statistik-snapshot-test-'));
    try {
        await run(`http://127.0.0.1:${address.port}/mcp`, path.join(directory, 'snapshot.yaml'));
    } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
        await rm(directory, {recursive: true, force: true});
    }
}

describe('statistik snapshot script', () => {
    it('rejects remote HTTP and local HTTP without a local token before fetching', async () => {
        await expect(
            runScript(scriptEnv({STRAPI_MCP_URL: 'http://example.com/mcp', STRAPI_MCP_ADMIN_TOKEN_PROD: 'prod-token'})),
        ).rejects.toMatchObject({stderr: expect.stringContaining('MCP endpoint must use HTTPS')});
        await expect(
            runScript(scriptEnv({STRAPI_MCP_URL: 'http://127.0.0.1:1/mcp', STRAPI_MCP_ADMIN_TOKEN_PROD: 'prod-token'})),
        ).rejects.toMatchObject({stderr: expect.stringContaining('local HTTP with STRAPI_MCP_ADMIN_TOKEN_LOCAL')});
        await expect(
            runScript(scriptEnv({STRAPI_MCP_URL: 'http://127.0.0.1:1/mcp', STRAPI_MCP_ADMIN_TOKEN_LOCAL: 'local-token', STRAPI_MCP_TOKEN: 'other-token'})),
        ).rejects.toMatchObject({stderr: expect.stringContaining('local HTTP with STRAPI_MCP_ADMIN_TOKEN_LOCAL')});
        await expect(runScript(scriptEnv({STRAPI_MCP_URL: 'https://example.com/mcp'}))).rejects.toMatchObject({
            stderr: expect.stringContaining('Missing MCP token'),
        });
    });

    it('selects its SSE response by ID and fetches known remaining pages concurrently', async () => {
        let page2Pending = false;
        let overlapped = false;
        await withMockMcp(
            (name, page, id, response) => {
                if (name !== 'list_article') return sendRpc(response, id, [], 1);
                if (page === 1) {
                    response.setHeader('content-type', 'text/event-stream');
                    response.end(
                        'event: message\ndata: {"jsonrpc":"2.0","method":"notifications/progress"}\n\n' +
                            'event: message\ndata: {"jsonrpc":"2.0","id":999,"result":{}}\n\n' +
                            `event: message\ndata: ${JSON.stringify({jsonrpc: '2.0', id, result: {structuredContent: {results: [article(1)], pagination: {page: 1, pageSize: 100, pageCount: 3, total: 3}}}})}\n\n`,
                    );
                } else if (page === 2) {
                    page2Pending = true;
                    setTimeout(() => {
                        page2Pending = false;
                        sendRpc(response, id, [article(2)], 3);
                    }, 100);
                } else {
                    overlapped = page2Pending;
                    sendRpc(response, id, [article(3)], 3);
                }
            },
            async (url, outFile) => {
                await runScript(scriptEnv({STRAPI_MCP_URL: url, STRAPI_MCP_ADMIN_TOKEN_LOCAL: 'local-token', STATISTIK_SNAPSHOT_OUT: outFile}));
                expect(parseStatistikSnapshot(await readFile(outFile, 'utf8')).articles.map((item) => item.slug)).toEqual(['a1', 'a2', 'a3']);
                expect(await readdir(path.dirname(outFile))).toEqual(['snapshot.yaml']);
            },
        );
        expect(overlapped).toBe(true);
    });

    it('continues past a full page when pagination is absent', async () => {
        await withMockMcp(
            (name, page, id, response) => {
                if (name !== 'list_article') return sendRpc(response, id, []);
                sendRpc(response, id, page === 1 ? Array.from({length: 100}, (_, index) => article(index)) : [article(100)]);
            },
            async (url, outFile) => {
                await runScript(scriptEnv({STRAPI_MCP_URL: url, STRAPI_MCP_ADMIN_TOKEN_LOCAL: 'local-token', STATISTIK_SNAPSHOT_OUT: outFile}));
                expect(parseStatistikSnapshot(await readFile(outFile, 'utf8')).articles).toHaveLength(101);
            },
        );
    });
});
