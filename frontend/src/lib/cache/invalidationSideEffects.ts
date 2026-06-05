import {feedRegistry} from '@/src/lib/rss/feedRegistry';

import {type InvalidationTarget} from './invalidationTaxonomy';

export const INVALIDATION_SIDE_EFFECTS: Partial<
    Record<InvalidationTarget, () => void | Promise<void>>
> = {
    articlefeed: () => feedRegistry.onInvalidate('articlefeed'),
    audiofeed: () => feedRegistry.onInvalidate('audiofeed'),
};
