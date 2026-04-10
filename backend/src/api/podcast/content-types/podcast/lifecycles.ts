import {queueCacheInvalidation} from '../../../../services/asyncCacheInvalidationQueue';

export default {
    async afterUpdate(_event: any) {
        queueCacheInvalidation('podcast', strapi);
        queueCacheInvalidation('sitemap', strapi);
    },
    async afterCreate(_event: any) {
        queueCacheInvalidation('podcast', strapi);
        queueCacheInvalidation('sitemap', strapi);
    },
    async afterDelete(_event: any) {
        queueCacheInvalidation('podcast', strapi);
        queueCacheInvalidation('sitemap', strapi);
    },
};

