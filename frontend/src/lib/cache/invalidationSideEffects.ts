import {scheduleDebouncedRefresh as scheduleArticleFeedRefresh} from '@/src/lib/rss/articleFeedRouteHandler';
import {scheduleDebouncedRefresh as scheduleAudioFeedRefresh} from '@/src/lib/rss/audioFeedRouteHandler';

import {type InvalidationTarget} from './invalidationTaxonomy';

export const INVALIDATION_SIDE_EFFECTS: Partial<
    Record<InvalidationTarget, () => void | Promise<void>>
> = {
    articlefeed: scheduleArticleFeedRefresh,
    audiofeed: scheduleAudioFeedRefresh,
};
