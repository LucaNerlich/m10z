/**
 * article router
 */

import {factories} from '@strapi/strapi';

export default factories.createCoreRouter('api::article.article', {
    config: {
        // Draft & publish: pin anonymous callers to published entries so that
        // `?status=draft` cannot expose unpublished articles.
        find: {policies: ['global::published-status-only']},
        findOne: {policies: ['global::published-status-only']},
    },
});
