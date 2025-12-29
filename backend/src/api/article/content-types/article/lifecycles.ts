import {invalidateNext} from '../../../../utils/invalidateNextCache';

export default {
    async afterUpdate(_event: any) {
        await invalidateNext('article');
    },
    async afterCreate(_event: any) {
        await invalidateNext('article');
    },
    async afterDelete(_event: any) {
        await invalidateNext('article');
    },
};

