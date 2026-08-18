import {describe, expect, test, vi} from 'vitest';

import {generateMissingWordCounts, WORDCOUNT_BATCH_SIZE} from './wordcount';

const PUBLISHED_AT = '2026-04-20T10:00:00.000Z';

function makeStrapi({
    publishedDocs = [],
    draftDocs = [],
}: {
    publishedDocs?: Array<Record<string, unknown>>;
    draftDocs?: Array<Record<string, unknown>>;
} = {}) {
    const findManyCalls: Array<Record<string, unknown>> = [];
    const update = vi.fn(() => Promise.resolve({}));
    const publish = vi.fn(() => Promise.resolve({}));
    const updateMany = vi.fn(() => Promise.resolve({count: 1}));

    const makeFindMany = (published: Array<Record<string, unknown>>, drafts: Array<Record<string, unknown>>) =>
        vi.fn((params: {status?: string; hasPublishedVersion?: boolean}) => {
            findManyCalls.push(params);
            if (params.status === 'published') {
                return Promise.resolve(published);
            }
            if (params.hasPublishedVersion === false) {
                return Promise.resolve(drafts);
            }
            return Promise.resolve([]);
        });

    const articleHandler = {
        findMany: makeFindMany(publishedDocs, draftDocs),
        update,
        publish,
    };
    const podcastHandler = {
        findMany: makeFindMany([], []),
        update: vi.fn(() => Promise.resolve({})),
        publish: vi.fn(() => Promise.resolve({})),
    };

    const strapi = {
        documents: vi.fn((uid: string) =>
            uid === 'api::podcast.podcast' ? podcastHandler : articleHandler,
        ),
        db: {
            query: vi.fn(() => ({updateMany})),
        },
        log: {info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn()},
    };

    return {strapi, findManyCalls, update, publish, updateMany};
}

describe('generateMissingWordCounts filter and pagination', () => {
    test('only targets documents with a null wordCount (0 must not match)', async () => {
        const {strapi, findManyCalls} = makeStrapi();

        await generateMissingWordCounts({strapi});

        // Four backfill runs (articles/podcasts × published/draft); each must use the
        // narrow filter so documents with a legitimate 0 wordCount are never re-processed.
        expect(findManyCalls).toHaveLength(4);
        for (const params of findManyCalls) {
            expect(params.filters).toEqual({wordCount: {$null: true}});
        }
    });

    test('caps each findMany with Document Service limit/start, not nested pagination', async () => {
        const {strapi, findManyCalls} = makeStrapi();

        await generateMissingWordCounts({strapi});

        for (const params of findManyCalls) {
            expect(params.limit).toBe(WORDCOUNT_BATCH_SIZE);
            expect(params.start).toBe(0);
            expect(params.pagination).toBeUndefined();
        }
    });
});

describe('generateMissingWordCounts (published backfill)', () => {
    test('patches the published row in place and never calls publish() or draft update()', async () => {
        const {strapi, update, publish, updateMany} = makeStrapi({
            publishedDocs: [
                {
                    documentId: 'doc-1',
                    slug: 'my-article',
                    content: 'Hallo Welt',
                    updatedAt: PUBLISHED_AT,
                },
            ],
        });

        await generateMissingWordCounts({strapi});

        expect(updateMany).toHaveBeenCalledTimes(1);
        expect(updateMany).toHaveBeenCalledWith({
            where: {documentId: 'doc-1', publishedAt: {$ne: null}},
            data: {wordCount: 2, updatedAt: PUBLISHED_AT},
        });
        expect(update).not.toHaveBeenCalled();
        expect(publish).not.toHaveBeenCalled();
    });
});

describe('generateMissingWordCounts (never-published drafts)', () => {
    test('updates the draft and publishes when the scheduled date is due', async () => {
        const {strapi, update, publish, updateMany} = makeStrapi({
            draftDocs: [
                {
                    documentId: 'draft-1',
                    slug: 'scheduled-article',
                    content: 'Hallo Welt',
                    date: '2020-01-01T00:00:00.000Z',
                },
            ],
        });

        await generateMissingWordCounts({strapi});

        expect(update).toHaveBeenCalledWith({
            documentId: 'draft-1',
            data: {wordCount: 2},
        });
        expect(publish).toHaveBeenCalledWith({documentId: 'draft-1'});
        expect(updateMany).not.toHaveBeenCalled();
    });

    test('updates the draft but does not publish when the date is still in the future', async () => {
        const {strapi, update, publish} = makeStrapi({
            draftDocs: [
                {
                    documentId: 'draft-1',
                    slug: 'future-article',
                    content: 'Hallo Welt',
                    date: '2099-01-01T00:00:00.000Z',
                },
            ],
        });

        await generateMissingWordCounts({strapi});

        expect(update).toHaveBeenCalledTimes(1);
        expect(publish).not.toHaveBeenCalled();
    });
});
