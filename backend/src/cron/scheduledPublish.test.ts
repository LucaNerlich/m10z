import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {
    getSchedulePublishCutoffIso,
    publishDraftIfScheduledDateReached,
    publishScheduledEntries,
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

describe('publishScheduledEntries pagination', () => {
    test('uses Document Service limit/start rather than nested pagination', async () => {
        const findMany = vi.fn(() => Promise.resolve([]));
        const strapi = {
            documents: vi.fn(() => ({findMany, publish: vi.fn()})),
            log: {info: vi.fn(), debug: vi.fn(), error: vi.fn()},
        };

        await publishScheduledEntries({strapi});

        expect(findMany.mock.calls.length).toBeGreaterThan(0);
        for (const [params] of findMany.mock.calls) {
            expect(params.limit).toBe(25);
            expect(params.start).toBe(0);
            expect(params.pagination).toBeUndefined();
        }
    });

    test('does not skip due drafts when publish() removes drafts while paging', async () => {
        const PAGE_SIZE = 25;
        const dueDrafts = Array.from({length: PAGE_SIZE + 10}, (_, i) => ({
            documentId: `draft-${i + 1}`,
            slug: `slug-${i + 1}`,
        }));

        // Simulate Strapi where publishing deletes the corresponding draft rows.
        const remainingDrafts = dueDrafts.slice();

        const findMany = vi.fn(async (params: any) => {
            const start = params.start ?? 0;
            const limit = params.limit ?? PAGE_SIZE;
            return remainingDrafts.slice(start, start + limit);
        });

        const publish = vi.fn(async ({documentId}: {documentId: string}) => {
            const idx = remainingDrafts.findIndex((d) => d.documentId === documentId);
            if (idx !== -1) remainingDrafts.splice(idx, 1);
            return {};
        });

        const strapi = {
            documents: vi.fn(() => ({findMany, publish})),
            log: {info: vi.fn(), debug: vi.fn(), error: vi.fn()},
        };

        await publishScheduledEntries({strapi});

        // All due drafts should have been published exactly once.
        expect(publish).toHaveBeenCalledTimes(dueDrafts.length);
        const publishedIds = publish.mock.calls.map((c) => c[0].documentId).sort();
        const expectedIds = dueDrafts.map((d) => d.documentId).sort();
        expect(publishedIds).toEqual(expectedIds);
    });
});

describe('publishScheduledEntries', () => {
    const ARTICLE_UID = 'api::article.article';

    /** Strapi double whose `findMany` serves one page of due drafts per content type. */
    function makeCronStrapi(duePerType: Record<string, number>, publishImpl?: () => Promise<unknown>) {
        let inFlight = 0;
        let maxInFlight = 0;

        const publish = vi.fn(async (args: {documentId: string}) => {
            inFlight++;
            maxInFlight = Math.max(maxInFlight, inFlight);
            try {
                return await (publishImpl ? publishImpl() : Promise.resolve({}));
            } finally {
                inFlight--;
            }
        });

        const remaining = new Map(Object.entries(duePerType));

        const documents = vi.fn((uid: string) => ({
            findMany: vi.fn(async () => {
                const left = remaining.get(uid) ?? 0;
                if (left === 0) return [];
                remaining.set(uid, 0);
                return Array.from({length: left}, (_, index) => ({
                    documentId: `${uid}-${index}`,
                    slug: `doc-${index}`,
                }));
            }),
            publish,
        }));

        return {
            strapi: {
                documents,
                log: {info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn()},
            },
            publish,
            maxInFlight: () => maxInFlight,
        };
    }

    test('publishes every due entry in bounded batches', async () => {
        const {strapi, publish, maxInFlight} = makeCronStrapi({[ARTICLE_UID]: 25});

        await publishScheduledEntries({strapi});

        expect(publish).toHaveBeenCalledTimes(25);
        // The fan-out was unbounded before: all 25 would start at once.
        expect(maxInFlight()).toBeLessThanOrEqual(10);
        expect(maxInFlight()).toBeGreaterThan(1);
    });

    test('skips the tick when a previous run is still active', async () => {
        let release: () => void = () => {};
        const gate = new Promise<void>((resolveGate) => {
            release = resolveGate;
        });
        const {strapi, publish} = makeCronStrapi({[ARTICLE_UID]: 3}, () => gate);

        const first = publishScheduledEntries({strapi});
        await Promise.resolve();
        const callsAfterFirstRunStarted = publish.mock.calls.length;

        await publishScheduledEntries({strapi});

        expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('skipping this tick'));
        expect(publish.mock.calls.length).toBe(callsAfterFirstRunStarted);

        release();
        await first;
    });

    test('a run that finishes releases the guard for the next tick', async () => {
        const {strapi, publish} = makeCronStrapi({[ARTICLE_UID]: 1});

        await publishScheduledEntries({strapi});
        await publishScheduledEntries({strapi});

        expect(publish).toHaveBeenCalledTimes(1);
        expect(strapi.log.warn).not.toHaveBeenCalled();
    });
});
