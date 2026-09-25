/**
 * Statistik snapshot generator (issue #706).
 *
 * Pulls every published article, podcast, author and category from the Strapi
 * MCP endpoint (the same server configured as `strapi-prod` in `.cursor/mcp.json`)
 * and writes the flat, minimal snapshot rendered by `/statistik` to
 * `public/statistik/snapshot.yaml`.
 *
 * Run manually — it is not part of the build:
 *
 *   STRAPI_MCP_ADMIN_TOKEN_PROD=… pnpm run snapshot:statistik
 *   pnpm run snapshot:statistik -- --local        # against http://localhost:1337/mcp
 *   pnpm run snapshot:statistik -- --dry-run      # print a summary, write nothing
 *
 * Overrides: STRAPI_MCP_URL, STRAPI_MCP_TOKEN, STATISTIK_SNAPSHOT_OUT.
 */

import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {
    buildStatistikSnapshot,
    parseStatistikSnapshot,
    type RawStrapiContentDoc,
    type RawStrapiNamedDoc,
    serializeStatistikSnapshot,
} from '@/src/lib/statistik/snapshot';

const PAGE_SIZE = 100;
const MAX_PAGES = 100;

const args = new Set(process.argv.slice(2));
const useLocal = args.has('--local');
const dryRun = args.has('--dry-run');

const endpoint = process.env.STRAPI_MCP_URL ?? (useLocal ? 'http://localhost:1337/mcp' : 'https://cms.m10z.de/mcp');
const token =
    process.env.STRAPI_MCP_TOKEN ??
    (useLocal ? process.env.STRAPI_MCP_ADMIN_TOKEN_LOCAL : process.env.STRAPI_MCP_ADMIN_TOKEN_PROD);
const outFile = process.env.STATISTIK_SNAPSHOT_OUT ?? path.join(__dirname, '..', 'public', 'statistik', 'snapshot.yaml');

type ListPayload<T> = {
    results: T[];
    pagination?: {page: number; pageSize: number; pageCount: number; total: number};
};

type JsonRpcResponse = {
    result?: {
        isError?: boolean;
        structuredContent?: unknown;
        content?: {type: string; text?: string}[];
    };
    error?: {code: number; message: string};
};

let requestId = 0;

/** The MCP Streamable HTTP transport may answer with plain JSON or a single SSE `message` event. */
function parseRpcBody(body: string, contentType: string): JsonRpcResponse {
    if (!contentType.includes('text/event-stream')) return JSON.parse(body) as JsonRpcResponse;
    const data = body
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('');
    return JSON.parse(data) as JsonRpcResponse;
}

async function callTool<T>(name: string, toolArgs: Record<string, unknown>): Promise<T> {
    requestId += 1;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify({jsonrpc: '2.0', id: requestId, method: 'tools/call', params: {name, arguments: toolArgs}}),
    });
    if (!response.ok) throw new Error(`MCP ${name} failed with HTTP ${response.status}`);

    const rpc = parseRpcBody(await response.text(), response.headers.get('content-type') ?? '');
    if (rpc.error) throw new Error(`MCP ${name} failed: ${rpc.error.message}`);
    if (!rpc.result || rpc.result.isError) throw new Error(`MCP ${name} returned an error result`);

    if (rpc.result.structuredContent) return rpc.result.structuredContent as T;
    const text = rpc.result.content?.find((item) => item.type === 'text')?.text;
    if (!text) throw new Error(`MCP ${name} returned no content`);
    return JSON.parse(text) as T;
}

async function listAll<T>(tool: string, extraArgs: Record<string, unknown> = {}): Promise<T[]> {
    const all: T[] = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
        const payload = await callTool<ListPayload<T>>(tool, {pageSize: PAGE_SIZE, page, ...extraArgs});
        all.push(...payload.results);
        const pageCount = payload.pagination?.pageCount ?? 1;
        if (page >= pageCount || payload.results.length === 0) return all;
    }
    throw new Error(`${tool}: more than ${MAX_PAGES} pages — aborting`);
}

async function main(): Promise<void> {
    if (!token) {
        throw new Error(
            `Missing MCP token. Set ${useLocal ? 'STRAPI_MCP_ADMIN_TOKEN_LOCAL' : 'STRAPI_MCP_ADMIN_TOKEN_PROD'} (or STRAPI_MCP_TOKEN).`,
        );
    }
    console.log(`Fetching published content from ${endpoint} …`);

    const published = {status: 'published', sort: 'date:asc'};
    const [articles, podcasts, authors, categories] = await Promise.all([
        listAll<RawStrapiContentDoc>('list_article', published),
        listAll<RawStrapiContentDoc>('list_podcast', published),
        listAll<RawStrapiNamedDoc>('list_author', {status: 'published'}),
        listAll<RawStrapiNamedDoc>('list_category', {status: 'published'}),
    ]);

    const snapshot = buildStatistikSnapshot({
        generatedAt: new Date().toISOString(),
        articles,
        podcasts,
        authors,
        categories,
    });
    const yaml = serializeStatistikSnapshot(snapshot);
    // Guard: the page must be able to read what we write.
    parseStatistikSnapshot(yaml);

    console.log(
        `Snapshot: ${snapshot.articles.length}/${articles.length} Artikel, ` +
            `${snapshot.podcasts.length}/${podcasts.length} Podcasts, ` +
            `${snapshot.authors.length} Autor:innen, ${snapshot.categories.length} Kategorien.`,
    );

    if (dryRun) {
        console.log('Dry run — nothing written.');
        return;
    }
    await mkdir(path.dirname(outFile), {recursive: true});
    await writeFile(outFile, yaml, 'utf8');
    console.log(`Wrote ${path.relative(process.cwd(), outFile)} (${Buffer.byteLength(yaml)} bytes).`);
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
