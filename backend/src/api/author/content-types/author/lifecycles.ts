import {invalidateNext} from '../../../../utils/invalidateNextCache';

export default {
    async afterUpdate(_event: any) {
        await invalidateNext('author');
    },
    async afterCreate(_event: any) {
        await invalidateNext('author');
    },
    async afterDelete(_event: any) {
        await invalidateNext('author');
    },
};

