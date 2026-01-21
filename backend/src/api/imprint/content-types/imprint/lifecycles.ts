import {queueCacheInvalidation} from '../../../../services/asyncCacheInvalidationQueue';

export default {
    async afterUpdate(_event: any) {
        queueCacheInvalidation('legal', strapi);
    },
};

