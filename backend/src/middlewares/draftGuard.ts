/**
 * Global middleware that blocks anonymous access to draft content.
 *
 * Strapi 5's content API serves drafts to any caller with `find`/`findOne`
 * permission via `?status=draft` (see strapi/strapi#25326). This guard rewrites
 * `status=draft` to `status=published` for unauthenticated content-API
 * requests, so unpublished articles/podcasts stay private. Authenticated
 * callers (API tokens, admin) keep normal draft access — the frontend preview
 * route fetches drafts with `STRAPI_API_TOKEN`.
 */

export default () => {
    return async (ctx: any, next: any) => {
        const isContentApi = ctx.path.startsWith('/api/') || ctx.path.startsWith('/graphql');
        const requestsDrafts = typeof ctx.query?.status === 'string' && ctx.query.status === 'draft';

        if (isContentApi && requestsDrafts && !ctx.state.auth) {
            ctx.query.status = 'published';
        }

        await next();
    };
};
