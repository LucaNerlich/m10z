import { invalidateNext } from '../../../../utils/invalidateNextCache';

export default {
  async afterUpdate(_event: any) {
    // Feed channel metadata changed (title/desc/image/mail) => invalidate RSS.
    await invalidateNext('audiofeed');
  },
};


