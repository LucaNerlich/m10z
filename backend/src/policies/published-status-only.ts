/**
 * Content-API policy: keep draft entries off the public routes.
 *
 * Anonymous and end-user requests are pinned to `status=published`, so
 * `?status=draft` can no longer expose unpublished articles or podcasts.
 * Privileged API-token callers (the server-to-server preview path) keep the
 * status they asked for.
 *
 * Wired into the article and podcast core routers for `find` and `findOne`.
 */

import {forcePublishedStatus, mayRequestAnyStatus, type QueryContext} from '../utils/publishedStatus';

export default (ctx: QueryContext): boolean => {
    if (!mayRequestAnyStatus(ctx)) {
        forcePublishedStatus(ctx);
    }
    return true;
};
