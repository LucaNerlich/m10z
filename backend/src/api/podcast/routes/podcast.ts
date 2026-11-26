/**
 * podcast router
 */

import {factories} from '@strapi/strapi';

import {PUBLISHED_ONLY_ROUTE_CONFIG} from '../../../policies/published-status-only';

export default factories.createCoreRouter('api::podcast.podcast', {
    config: {
        // Draft & publish: pin anonymous callers to published entries so that
        // `?status=draft` cannot expose unpublished episodes.
        ...PUBLISHED_ONLY_ROUTE_CONFIG,
    },
});
