/**
 * author router
 */

import {factories} from '@strapi/strapi';

export default factories.createCoreRouter('api::author.author', {
    config: {
        // Draft & publish: pin anonymous callers to published entries so that
        // `?status=draft` cannot expose unpublished episodes via `populate`.
        find: {policies: ['global::published-status-only']},
        findOne: {policies: ['global::published-status-only']},
    },
});
