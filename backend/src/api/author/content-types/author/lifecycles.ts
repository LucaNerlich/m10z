import {queueCacheInvalidation} from '../../../../services/asyncCacheInvalidationQueue';

export default {
    async afterUpdate(_event: any) {
        queueCacheInvalidation('author', strapi);
    },
    async afterCreate(_event: any) {
        queueCacheInvalidation('author', strapi);
    },
    async afterDelete(_event: any) {
        queueCacheInvalidation('author', strapi);
    },
};

