import { invalidateNext } from '../../../../utils/invalidateNextCache';

export default {
  async afterUpdate(_event: any) {
    await invalidateNext('articlefeed');
  },
};


