/**
 * Draft-status guard for the public content API.
 *
 * Strapi applies `status: 'published'` only as a *default* when it builds fetch
 * params (`{status: 'published', ...params}`), so a client-supplied `?status=`
 * query param silently overrides it and makes unpublished entries readable.
 *
 * Only privileged, server-to-server callers may ask for another status: API
 * token requests authenticate through the content-api strategy and leave
 * `ctx.state.user` unset, while users-permissions requests set it.
 */

export type QueryContext = {
    query?: Record<string, unknown>;
    state?: {
        auth?: unknown;
        user?: unknown;
    };
};

/**
 * Whether the request may read a status other than `published`.
 *
 * Anonymous and end-user (users-permissions) requests may not; API-token
 * requests may.
 */
export function mayRequestAnyStatus(ctx: QueryContext | null | undefined): boolean {
    const state = ctx?.state;
    if (!state || !state.auth) return false;
    // API tokens authenticate without a users-permissions user; end-user JWTs set one.
    return !state.user;
}

/**
 * Pins the content-API `status` query param to `published`.
 *
 * Mutates the parsed query object in place so the controller — which reads
 * `ctx.query` after the policy chain — sees the narrowed value. A no-op when no
 * status was requested or it is already `published`.
 */
export function forcePublishedStatus(ctx: QueryContext | null | undefined): void {
    const query = ctx?.query;
    if (!query || typeof query !== 'object') return;
    if (query.status === undefined || query.status === 'published') return;
    query.status = 'published';
}
