/**
 * Draft-status guard for the public content API.
 *
 * Strapi applies `status: 'published'` only as a *default* when it builds fetch
 * params (`{status: 'published', ...params}`), so a client-supplied `?status=`
 * query param silently overrides it and makes unpublished entries readable.
 */

export type QueryContext = {
    /**
     * The Koa request. Reached through `request` rather than `query` because
     * policies receive `Object.assign({is, type}, ctx)` — a shallow copy — and
     * Koa's `ctx.query` is a prototype getter, so it is *not* copied. `request`
     * is an own property, so it is, and its `query` getter is live.
     */
    request?: {query?: Record<string, unknown> | null};
    query?: Record<string, unknown>;
    state?: {
        /**
         * Strapi's auth service sets `ctx.state.auth` for **every** request its
         * content-api strategy accepts — including anonymous ones — so its mere
         * presence is not a privilege signal; `credentials` is only populated for
         * an API token.
         */
        auth?: {credentials?: unknown} | null;
        user?: unknown;
        isAuthenticated?: boolean;
    };
};

/**
 * The live parsed query object for a Koa context or a Strapi policy context.
 */
function queryOf(ctx: QueryContext | null | undefined): Record<string, unknown> | undefined {
    if (!ctx || typeof ctx !== 'object') return undefined;
    const fromRequest = ctx.request?.query;
    if (fromRequest && typeof fromRequest === 'object') return fromRequest;
    const own = ctx.query;
    return own && typeof own === 'object' ? own : undefined;
}

/**
 * Whether the request may read a status other than `published`.
 *
 * Requires an API-token credential AND no users-permissions user, because
 * Strapi's content-api strategy accepts *anonymous* requests as authenticated:
 * it sets `ctx.state.auth` (and `isAuthenticated`) for them with
 * `credentials: null`, so `state.auth` alone is not a privilege signal.
 */
export function mayRequestAnyStatus(ctx: QueryContext | null | undefined): boolean {
    const state = ctx?.state;
    if (!state?.auth?.credentials) return false;
    return !state.user;
}

/**
 * Pins the content-API `status` query param to `published`.
 *
 * Mutates the parsed query object in place so the controller — which reads it
 * after the policy chain — sees the narrowed value. A no-op when no status was
 * requested or it is already `published`.
 */
export function forcePublishedStatus(ctx: QueryContext | null | undefined): void {
    const query = queryOf(ctx);
    if (!query) return;
    if (query.status === undefined || query.status === 'published') return;
    query.status = 'published';
}
