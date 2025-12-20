import { invalidateNext } from '../../../../utils/invalidateNextCache';

export default {
  async afterCreate(_event: any) {
    await invalidateNext('articlefeed');
  },

  async afterUpdate(_event: any) {
    await invalidateNext('articlefeed');
  },

  async afterDelete() {
    await invalidateNext('articlefeed');
  },
};


