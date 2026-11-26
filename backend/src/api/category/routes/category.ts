/**
 * category router
 */

import {factories} from '@strapi/strapi';

import {PUBLISHED_ONLY_ROUTE_CONFIG} from '../../../policies/published-status-only';

export default factories.createCoreRouter('api::category.category', {
    config: {
        // The category itself is not draft-enabled, but `?status=draft` is applied to
        // every populated level: without this guard a public request can read the
        // draft articles related to a category. Same policy as the article router.
        ...PUBLISHED_ONLY_ROUTE_CONFIG,
    },
});
