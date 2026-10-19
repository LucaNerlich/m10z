/**
 * category router
 */

import {factories} from '@strapi/strapi';

export default factories.createCoreRouter('api::category.category', {
    config: {
        // The category itself is not draft-enabled, but `?status=draft` is applied to
        // every populated level: without this guard a public request can read the
        // draft articles related to a category. Same policy as the article router.
        find: {policies: ['global::published-status-only']},
        findOne: {policies: ['global::published-status-only']},
    },
});
