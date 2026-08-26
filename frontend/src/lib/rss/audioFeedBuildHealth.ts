import {recordDiagnosticEvent} from '@/src/lib/diagnostics/runtimeDiagnostics';
import type {BuildSuccessInfo} from '@/src/lib/rss/feedCache';
import type {AudioFeedBuildTiming} from '@/src/lib/rss/buildAudioFeed';

const BUILD_HISTORY_LIMIT = 20;
const SLOW_BUILD_WINDOW = 3;
const SLOW_BUILD_MULTIPLIER = 2;

type AudioFeedBuildHealthState = {
    initialBuildDurationMs: number | null;
    buildDurationsMs: number[];
    lastBuildTiming: AudioFeedBuildTiming | null;
};

type AudioFeedBuildTrend = 'unknown' | 'increasing' | 'decreasing' | 'stable';

/** Snapshot of the audio feed build health, exposed via the diagnostics routes. */
export type AudioFeedRuntimeState = {
    schedulerStarted: boolean;
    hasTimer: boolean;
    schedulerStartedAtMs: number | null;
    uptimeMs: number;
    initialBuildDurationMs: number | null;
    buildCount: number;
    recentBuildDurationsMs: number[];
    trend: AudioFeedBuildTrend;
    threshold: {
        window: number;
        multiplier: number;
        thresholdMs: number | null;
        wouldTrigger: boolean;
    };
    lastBuildTiming: AudioFeedBuildTiming | null;
};

export type AudioFeedBuildHealth = {
    recordBuild: (info: BuildSuccessInfo & {lastBuildTiming?: AudioFeedBuildTiming}) => void;
    shouldReset: () => boolean;
    reset: () => void;
    getRuntimeState: (schedulerState: {
        schedulerStarted: boolean;
        hasTimer: boolean;
        schedulerStartedAtMs: number | null;
    }) => AudioFeedRuntimeState;
};

export function createAudioFeedBuildHealth(onReset: () => void): AudioFeedBuildHealth {
    const state: AudioFeedBuildHealthState = {
        initialBuildDurationMs: null,
        buildDurationsMs: [],
        lastBuildTiming: null,
    };

    function recordBuild(info: BuildSuccessInfo & {lastBuildTiming?: AudioFeedBuildTiming}) {
        const {durationMs, built, memoryUsedMB, memoryDeltaMB, lastBuildTiming} = info;

        if (state.initialBuildDurationMs === null) {
            state.initialBuildDurationMs = durationMs;
        }
        state.buildDurationsMs.push(durationMs);
        if (state.buildDurationsMs.length > BUILD_HISTORY_LIMIT) {
            state.buildDurationsMs.splice(0, state.buildDurationsMs.length - BUILD_HISTORY_LIMIT);
        }
        state.lastBuildTiming = lastBuildTiming ?? null;

        const thresholdMs = (state.initialBuildDurationMs ?? 0) * SLOW_BUILD_MULTIPLIER;
        const last3 = state.buildDurationsMs.slice(-SLOW_BUILD_WINDOW);
        const shouldResetNow =
            last3.length === SLOW_BUILD_WINDOW && last3.every((d) => d > thresholdMs);

        if (durationMs >= 500) {
            recordDiagnosticEvent({
                ts: Date.now(),
                kind: 'route',
                name: 'feed.audio.build.detail',
                ok: true,
                durationMs,
                detail: {
                    episodes: built.itemCount,
                    memoryUsedMB,
                    memoryDeltaMB,
                    ...(state.lastBuildTiming ? {lastBuildTiming: state.lastBuildTiming} : {}),
                    reset: shouldResetNow
                        ? {
                            scheduled: true,
                            reason: 'slow_build',
                            last3,
                            thresholdMs,
                            multiplier: SLOW_BUILD_MULTIPLIER,
                        }
                        : {scheduled: false},
                },
            });
        }

        if (shouldResetNow) {
            // onReset only clears cache/scheduler state; it cannot throw.
            queueMicrotask(onReset);
        }
    }

    function shouldReset(): boolean {
        const thresholdMs = (state.initialBuildDurationMs ?? 0) * SLOW_BUILD_MULTIPLIER;
        const last3 = state.buildDurationsMs.slice(-SLOW_BUILD_WINDOW);
        return last3.length === SLOW_BUILD_WINDOW && last3.every((d) => d > thresholdMs);
    }

    function reset() {
        state.initialBuildDurationMs = null;
        state.buildDurationsMs.splice(0, state.buildDurationsMs.length);
        state.lastBuildTiming = null;
    }

    function getRuntimeState(schedulerState: {
        schedulerStarted: boolean;
        hasTimer: boolean;
        schedulerStartedAtMs: number | null;
    }): AudioFeedRuntimeState {
        const now = Date.now();
        const uptimeMs = schedulerState.schedulerStartedAtMs ? now - schedulerState.schedulerStartedAtMs : 0;
        const last3 = state.buildDurationsMs.slice(-SLOW_BUILD_WINDOW);
        const hasEnough = last3.length === SLOW_BUILD_WINDOW && state.initialBuildDurationMs !== null;
        const thresholdMs = state.initialBuildDurationMs
            ? state.initialBuildDurationMs * SLOW_BUILD_MULTIPLIER
            : null;
        const wouldTrigger =
            hasEnough && thresholdMs !== null ? last3.every((d) => d > thresholdMs) : false;

        const trend: AudioFeedBuildTrend =
            state.buildDurationsMs.length >= 5
                ? (() => {
                    const first = state.buildDurationsMs[0] ?? 0;
                    const last = state.buildDurationsMs[state.buildDurationsMs.length - 1] ?? 0;
                    if (first <= 0) return 'unknown';
                    const ratio = last / first;
                    if (ratio >= 1.25) return 'increasing';
                    if (ratio <= 0.85) return 'decreasing';
                    return 'stable';
                })()
                : 'unknown';

        return {
            ...schedulerState,
            uptimeMs,
            initialBuildDurationMs: state.initialBuildDurationMs,
            buildCount: state.buildDurationsMs.length,
            recentBuildDurationsMs: state.buildDurationsMs.slice(),
            trend,
            threshold: {
                window: SLOW_BUILD_WINDOW,
                multiplier: SLOW_BUILD_MULTIPLIER,
                thresholdMs,
                wouldTrigger,
            },
            lastBuildTiming: state.lastBuildTiming,
        };
    }

    return {recordBuild, shouldReset, reset, getRuntimeState};
}

export function resetAudioFeedBuildHealthForDiagnostics(
    health: AudioFeedBuildHealth,
    cacheReset: () => void,
    reason: 'manual' | 'slow_build' = 'manual',
) {
    health.reset();
    recordDiagnosticEvent({
        ts: Date.now(),
        kind: 'route',
        name: 'feed.audio.reset',
        ok: true,
        durationMs: 0,
        detail: {reason},
    });
    cacheReset();
}
