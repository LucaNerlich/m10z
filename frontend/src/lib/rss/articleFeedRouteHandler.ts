import {feedRegistry} from '@/src/lib/rss/feedRegistry';

export const buildArticleFeedResponse = feedRegistry.article.handle;
export const scheduleDebouncedRefresh = feedRegistry.article.scheduleDebouncedRefresh;
export const stopScheduler = feedRegistry.article.stopScheduler;
export const getSchedulerState = feedRegistry.article.getSchedulerState;
