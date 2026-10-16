/**
 * Shared Streamable-HTTP transport for the Strapi MCP endpoint.
 *
 * Consumed by the frontend snapshot/index scripts and the backend caption
 * pipeline; both workspaces sync this file into their committed contracts
 * copies. Paging strategies and pipeline-specific batching stay in the callers.
 */

export type McpConfig = {
    endpoint: string;
    /** CMS origin without the `/mcp` path, used to resolve media URLs. */
    origin: string;
    token: string;
    localHttp: boolean;
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

/**
 * Resolve the MCP endpoint and Admin token from the environment.
 *
 * `--local` (or a localhost endpoint) uses `STRAPI_MCP_ADMIN_TOKEN_LOCAL`,
 * otherwise `STRAPI_MCP_ADMIN_TOKEN_PROD`; `STRAPI_MCP_TOKEN` overrides both.
 * `STRAPI_MCP_URL` overrides the endpoint. Non-HTTPS endpoints are only
 * allowed for localhost, and only when the token is the local one — a
 * production token must never travel over plain HTTP.
 */
export function resolveMcpConfig(
    options: {useLocal?: boolean; env?: Record<string, string | undefined>} = {}
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

export type McpRetryOptions = {
    /** Total attempts (default: 1 — no retry). */
    attempts?: number;
    /** Base of the exponential backoff between attempts. */
    baseDelayMs?: number;
    onRetry?: (error: unknown, attempt: number, tool: string) => void;
};

export type McpTransportOptions = {
    /** Per-request abort timeout; omitted means no client-side timeout. */
    timeoutMs?: number;
    retry?: McpRetryOptions;
};

export type McpTransport = {
    callTool: <T>(
        name: string,
        toolArgs: Record<string, unknown>
    ) => Promise<T>;
};

/**
 * Create a transport for the stateless Strapi MCP server: each `tools/call` is
 * an independent POST, so no session handshake is needed.
 */
export function createMcpTransport(
    config: Pick<McpConfig, 'endpoint' | 'token'>,
    options: McpTransportOptions = {}
): McpTransport {
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

    async function callOnce<T>(
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
            ...(options.timeoutMs
                ? {signal: AbortSignal.timeout(options.timeoutMs)}
                : {}),
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

    async function callTool<T>(
        name: string,
        toolArgs: Record<string, unknown>
    ): Promise<T> {
        const attempts = options.retry?.attempts ?? 1;
        const baseDelayMs = options.retry?.baseDelayMs ?? 700;
        let lastError: unknown;

        for (let attempt = 1; attempt <= attempts; attempt += 1) {
            try {
                return await callOnce<T>(name, toolArgs);
            } catch (error) {
                lastError = error;
                if (attempt >= attempts) break;
                options.retry?.onRetry?.(error, attempt, name);
                await new Promise((resolve) =>
                    setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1))
                );
            }
        }

        throw lastError instanceof Error
            ? lastError
            : new Error(String(lastError));
    }

    return {callTool};
}
