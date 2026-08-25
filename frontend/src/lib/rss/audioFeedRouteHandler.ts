import {feedRegistry} from '@/src/lib/rss/feedRegistry';

export const buildAudioFeedResponse = feedRegistry.audio.handle;
export const stopScheduler = feedRegistry.audio.stopScheduler;
export const getSchedulerState = feedRegistry.audio.getSchedulerState;

export function getAudioFeedRuntimeState() {
    return feedRegistry.getAudioFeedRuntimeState();
}
