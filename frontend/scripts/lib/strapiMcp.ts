/**
 * MCP client for the frontend scripts under `frontend/scripts`.
 *
 * The transport and config resolution live in the shared module (synced into
 * `src/lib/shared/contracts/mcp/transport.ts`); this wrapper keeps the paging
 * strategy the snapshot/index scripts share local.
 */

import {
    createMcpTransport,
    resolveMcpConfig,
    type McpConfig,
} from '../../src/lib/shared/contracts/mcp/transport';

export {resolveMcpConfig};
export type {McpConfig};

export type McpListOptions = {
    pageSize?: number;
    maxPages?: number;
};

type ListPayload<T> = {
    results: T[];
    pagination?: {pageCount?: number; total?: number};
};

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_MAX_PAGES = 100;

export type McpClient = ReturnType<typeof createMcpClient>;

/** Create a client over the shared transport plus the frontend paging strategy. */
export function createMcpClient(config: Pick<McpConfig, 'endpoint' | 'token'>) {
    const {callTool} = createMcpTransport(config);

    /** Page through a `list_*` tool until every item is collected. */
    async function listAll<T>(
        tool: string,
        extraArgs: Record<string, unknown> = {},
        options: McpListOptions = {},
    ): Promise<T[]> {
        const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
        const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;

        const first = await callTool<ListPayload<T>>(tool, {
            pageSize,
            page: 1,
            ...extraArgs,
        });
        const all = [...(first.results ?? [])];
        if (all.length === 0) return all;

        if (first.pagination) {
            const pageCount = first.pagination.pageCount ?? 0;
            if (pageCount <= 1) return all;
            const lastPage = Math.min(Math.ceil(pageCount), maxPages);
            const remaining = await Promise.all(
                Array.from({length: lastPage - 1}, (_, index) =>
                    callTool<ListPayload<T>>(tool, {
                        pageSize,
                        page: index + 2,
                        ...extraArgs,
                    }),
                ),
            );
            for (const payload of remaining) {
                all.push(...(payload.results ?? []));
                if ((payload.results ?? []).length === 0) return all;
            }
            if (pageCount <= maxPages) return all;
            throw new Error(`${tool}: more than ${maxPages} pages — aborting`);
        }

        if (all.length < pageSize) return all;
        for (let page = 2; page <= maxPages; page += 1) {
            const payload = await callTool<ListPayload<T>>(tool, {
                pageSize,
                page,
                ...extraArgs,
            });
            all.push(...(payload.results ?? []));
            if ((payload.results ?? []).length < pageSize) return all;
        }
        throw new Error(`${tool}: more than ${maxPages} pages — aborting`);
    }

    return {callTool, listAll};
}
