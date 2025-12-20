import { invalidateNext } from '../../../../utils/invalidateNextCache';

function isPublished(result: unknown): boolean {
  if (!result || typeof result !== 'object') return false;
  const r = result as { publishedAt?: string | null };
  return Boolean(r.publishedAt);
}

export default {
  async afterCreate(event: any) {
    if (isPublished(event?.result)) await invalidateNext('audiofeed');
  },

  async afterUpdate(_event: any) {
    // Covers publish/unpublish and metadata changes; invalidate if it is/was published.
    await invalidateNext('audiofeed');
  },

  async afterDelete() {
    await invalidateNext('audiofeed');
  },
};


