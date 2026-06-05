import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {
    getSchedulePublishCutoffIso,
    publishDraftIfScheduledDateReached,
    SCHEDULE_PUBLISH_LEEWAY_MS,
} from './scheduledPublish';

const NOW = new Date('2026-04-20T12:00:00.000Z');

function makeStrapi(publishImpl?: () => Promise<unknown>) {
    const publish = vi.fn(publishImpl ?? (() => Promise.resolve({})));
    const strapi = {
        documents: vi.fn(() => ({publish})),
        log: {info: vi.fn(), error: vi.fn()},
    };
    return {strapi, publish};
}

describe('getSchedulePublishCutoffIso', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    test('returns now plus the leeway window as an ISO string', () => {
        expect(getSchedulePublishCutoffIso()).toBe(new Date(NOW.getTime() + SCHEDULE_PUBLISH_LEEWAY_MS).toISOString());
    });
});

describe('publishDraftIfScheduledDateReached', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    const base = {
        uid: 'api::article.article' as const,
        documentId: 'doc-1',
        slug: 'my-article',
        label: 'article',
    };

    test('does not publish when there is no date', async () => {
        const {strapi, publish} = makeStrapi();
        const result = await publishDraftIfScheduledDateReached({strapi, ...base, date: null});
        expect(result).toBe(false);
        expect(publish).not.toHaveBeenCalled();
    });

    test('does not publish when the date is beyond the leeway window', async () => {
        const {strapi, publish} = makeStrapi();
        const future = new Date(NOW.getTime() + 10 * 60 * 1000).toISOString();
        const result = await publishDraftIfScheduledDateReached({strapi, ...base, date: future});
        expect(result).toBe(false);
        expect(publish).not.toHaveBeenCalled();
    });

    test('publishes when the scheduled date is in the past', async () => {
        const {strapi, publish} = makeStrapi();
        const result = await publishDraftIfScheduledDateReached({strapi, ...base, date: '2020-01-01T00:00:00.000Z'});
        expect(result).toBe(true);
        expect(publish).toHaveBeenCalledWith({documentId: 'doc-1'});
    });

    test('publishes when the date falls within the future leeway window', async () => {
        const {strapi, publish} = makeStrapi();
        const withinLeeway = new Date(NOW.getTime() + 60 * 1000).toISOString();
        const result = await publishDraftIfScheduledDateReached({strapi, ...base, date: withinLeeway});
        expect(result).toBe(true);
        expect(publish).toHaveBeenCalledTimes(1);
    });

    test('returns false when publishing throws', async () => {
        const {strapi} = makeStrapi(() => Promise.reject(new Error('boom')));
        const result = await publishDraftIfScheduledDateReached({strapi, ...base, date: '2020-01-01T00:00:00.000Z'});
        expect(result).toBe(false);
    });
});
