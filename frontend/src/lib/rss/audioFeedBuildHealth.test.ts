import {describe, expect, test, vi} from 'vitest';

import {createAudioFeedBuildHealth} from './audioFeedBuildHealth';
import type {BuildSuccessInfo} from './feedCache';

const schedulerState = {schedulerStarted: false, hasTimer: false, schedulerStartedAtMs: null};

function build(durationMs: number): BuildSuccessInfo {
    return {
        durationMs,
        built: {xml: '', etag: '', lastModified: null, itemCount: 1},
        memoryUsedMB: 0,
        memoryDeltaMB: 0,
    };
}

describe('createAudioFeedBuildHealth', () => {
    test('triggers one reset after three consecutive builds above twice the initial duration', async () => {
        const onReset = vi.fn();
        const health = createAudioFeedBuildHealth(onReset);

        // Baseline 100 ms → threshold 200 ms; the first build seeds the window.
        health.recordBuild(build(100));
        health.recordBuild(build(250));
        health.recordBuild(build(300));
        expect(onReset).not.toHaveBeenCalled();

        health.recordBuild(build(250));
        await Promise.resolve(); // queueMicrotask(onReset)

        expect(onReset).toHaveBeenCalledTimes(1);
        expect(health.shouldReset()).toBe(true);
        expect(health.getRuntimeState(schedulerState).threshold.wouldTrigger).toBe(true);
    });

    test('stays quiet when a build drops back below the threshold', () => {
        const onReset = vi.fn();
        const health = createAudioFeedBuildHealth(onReset);

        health.recordBuild(build(100));
        health.recordBuild(build(250));
        health.recordBuild(build(150)); // below 200 → the window is never all-slow
        health.recordBuild(build(250));

        expect(onReset).not.toHaveBeenCalled();
        expect(health.shouldReset()).toBe(false);
        expect(health.getRuntimeState(schedulerState).threshold.wouldTrigger).toBe(false);
    });

    test('wouldTrigger mirrors the reset decision even for a zero baseline', () => {
        const onReset = vi.fn();
        const health = createAudioFeedBuildHealth(onReset);

        // A 0 ms first build seeds the baseline; threshold 0 makes any build "slow".
        health.recordBuild(build(0));
        health.recordBuild(build(1));
        health.recordBuild(build(2));
        health.recordBuild(build(3));

        expect(health.shouldReset()).toBe(true);
        expect(health.getRuntimeState(schedulerState).threshold.wouldTrigger).toBe(true);
    });
});
