/**
 * Shared Streamable-HTTP client for the Strapi MCP endpoint.
 *
 * Used by the one-off scripts under `frontend/scripts` (statistik snapshot,
 * media index). Authentication uses an Admin token supplied via the
 * environment — never committed; the endpoints mirror `.cursor/mcp.json`.
 */

export type McpConfig = {
    endpoint: string;
    /** CMS origin without the `/mcp` path, used to resolve media URLs. */
    origin: string;
    token: string;
    localHttp: boolean;
};

export type McpListOptions = {
    pageSize?: number;
    maxPages?: number;
};

type ListPayload<T> = {
    results: T[];
    pagination?: {pageCount?: number; total?: number};
};

type JsonRpcResponse = {
    id?: number | string | null;
    result?: {
        isError?: boolean;
        structuredContent?: unknown;
        content?: {type: string; text?: string}[];
    };
    error?: {code: number; message: string};
};

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_MAX_PAGES = 100;

/**
 * Resolve the MCP endpoint and Admin token from the environment.
 *
 * `--local` (or a localhost endpoint) uses `STRAPI_MCP_ADMIN_TOKEN_LOCAL`,
 * otherwise `STRAPI_MCP_ADMIN_TOKEN_PROD`; `STRAPI_MCP_TOKEN` overrides both.
 * `STRAPI_MCP_URL` overrides the endpoint. Non-HTTPS endpoints are only
 * allowed for localhost.
 */
export function resolveMcpConfig(
    options: {useLocal?: boolean; env?: NodeJS.ProcessEnv} = {}
): McpConfig {
    const env = options.env ?? process.env;
    const useLocal = options.useLocal ?? false;

    const endpoint =
        env.STRAPI_MCP_URL ??
        (useLocal ? 'http://localhost:1337/mcp' : 'https://cms.m10z.de/mcp');
    const endpointUrl = URL.canParse(endpoint) ? new URL(endpoint) : null;
    if (!endpointUrl)
        throw new Error('MCP endpoint must be an absolute HTTP or HTTPS URL');
    const localHttp =
        endpointUrl.protocol === 'http:' &&
        LOCAL_HOSTS.includes(endpointUrl.hostname);

    const localToken = env.STRAPI_MCP_ADMIN_TOKEN_LOCAL;
    const token =
        env.STRAPI_MCP_TOKEN ??
        (useLocal || localHttp ? localToken : env.STRAPI_MCP_ADMIN_TOKEN_PROD);

    if (
        endpointUrl.protocol !== 'https:' &&
        (!localHttp || !localToken || token !== localToken)
    ) {
        throw new Error(
            'MCP endpoint must use HTTPS, or local HTTP with STRAPI_MCP_ADMIN_TOKEN_LOCAL'
        );
    }
    if (!token) {
        const name =
            useLocal || localHttp
                ? 'STRAPI_MCP_ADMIN_TOKEN_LOCAL'
                : 'STRAPI_MCP_ADMIN_TOKEN_PROD';
        throw new Error(
            `Missing MCP token. Set ${name} (or STRAPI_MCP_TOKEN).`
        );
    }

    return {
        endpoint,
        origin: `${endpointUrl.protocol}//${endpointUrl.host}`,
        token,
        localHttp: Boolean(localHttp),
    };
}

export type McpClient = ReturnType<typeof createMcpClient>;

/**
 * Create a client for the stateless Strapi MCP server: each `tools/call` is an
 * independent POST, so no session handshake is needed.
 */
export function createMcpClient(config: Pick<McpConfig, 'endpoint' | 'token'>) {
    let requestId = 0;

    /** The MCP Streamable HTTP transport may answer with plain JSON or SSE frames. */
    function parseRpcBody(
        body: string,
        contentType: string,
        id: number
    ): JsonRpcResponse {
        if (!contentType.includes('text/event-stream'))
            return JSON.parse(body) as JsonRpcResponse;
        for (const frame of body.split(/\r?\n\r?\n/)) {
            const data = frame
                .split(/\r?\n/)
                .filter((line) => line.startsWith('data:'))
                .map((line) => line.slice(5).trimStart())
                .join('\n');
            if (!data) continue;
            const rpc = JSON.parse(data) as JsonRpcResponse;
            if (rpc.id === id) return rpc;
        }
        throw new Error(`MCP response for request ${id} was missing`);
    }

    async function callTool<T>(
        name: string,
        toolArgs: Record<string, unknown>
    ): Promise<T> {
        const id = ++requestId;
        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id,
                method: 'tools/call',
                params: {name, arguments: toolArgs},
            }),
        });
        if (!response.ok)
            throw new Error(`MCP ${name} failed with HTTP ${response.status}`);

        const rpc = parseRpcBody(
            await response.text(),
            response.headers.get('content-type') ?? '',
            id
        );
        if (rpc.error)
            throw new Error(`MCP ${name} failed: ${rpc.error.message}`);
        if (!rpc.result || rpc.result.isError)
            throw new Error(`MCP ${name} returned an error result`);

        if (rpc.result.structuredContent)
            return rpc.result.structuredContent as T;
        const text = rpc.result.content?.find(
            (item) => item.type === 'text'
        )?.text;
        if (!text) throw new Error(`MCP ${name} returned no content`);
        return JSON.parse(text) as T;
    }

    /** Page through a `list_*` tool until every item is collected. */
    async function listAll<T>(
        tool: string,
        extraArgs: Record<string, unknown> = {},
        options: McpListOptions = {}
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
                    })
                )
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
