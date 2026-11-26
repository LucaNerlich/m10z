/**
 * Content-API policy: keep draft entries off the public routes.
 *
 * Anonymous and end-user requests are pinned to `status=published`, so
 * `?status=draft` cannot expose unpublished articles or podcasts. Privileged
 * API-token callers (the server-to-server preview path) keep the status they
 * asked for.
 *
 * Wired into the article, podcast, author, and category core routers for
 * `find` and `findOne`.
 */

import {forcePublishedStatus, mayRequestAnyStatus, type QueryContext} from '../utils/publishedStatus';

/**
 * Route config every draft-aware collection router spreads into its core router.
 *
 * Exported so the routers and the wiring test share one definition: the guard
 * is a contract, not a block of text copied per router.
 */
export const PUBLISHED_ONLY_ROUTE_CONFIG = {
    find: {policies: ['global::published-status-only']},
    findOne: {policies: ['global::published-status-only']},
};

export default (ctx: QueryContext): boolean => {
    if (!mayRequestAnyStatus(ctx)) {
        forcePublishedStatus(ctx);
    }
    return true;
};
