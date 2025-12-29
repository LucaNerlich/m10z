import {invalidateNext} from '../../../../utils/invalidateNextCache';

export default {
    async afterUpdate(_event: any) {
        await invalidateNext('podcast');
    },
    async afterCreate(_event: any) {
        await invalidateNext('podcast');
    },
    async afterDelete(_event: any) {
        await invalidateNext('podcast');
    },
};

