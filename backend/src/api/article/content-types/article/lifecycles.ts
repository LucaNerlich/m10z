import {queueCacheInvalidation} from '../../../../services/asyncCacheInvalidationQueue';

export default {
    async afterUpdate(_event: any) {
        queueCacheInvalidation('article', strapi);
    },
    async afterCreate(_event: any) {
        queueCacheInvalidation('article', strapi);
    },
    async afterDelete(_event: any) {
        queueCacheInvalidation('article', strapi);
    },
};

