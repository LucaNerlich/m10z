import {invalidateNext} from '../../../../utils/invalidateNextCache';

export default {
    async afterUpdate(_event: any) {
        await invalidateNext('category');
    },
    async afterCreate(_event: any) {
        await invalidateNext('category');
    },
    async afterDelete(_event: any) {
        await invalidateNext('category');
    },
};

