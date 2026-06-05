import {feedRegistry} from '@/src/lib/rss/feedRegistry';

export const buildAudioFeedResponse = feedRegistry.audio.handle;
export const scheduleDebouncedRefresh = feedRegistry.audio.scheduleDebouncedRefresh;
export const stopScheduler = feedRegistry.audio.stopScheduler;
export const getSchedulerState = feedRegistry.audio.getSchedulerState;

export function resetAudioFeedStateForDiagnostics(reason: 'manual' = 'manual') {
    feedRegistry.resetAudioFeedStateForDiagnostics(reason);
}

export function getAudioFeedRuntimeState() {
    return feedRegistry.getAudioFeedRuntimeState();
}
