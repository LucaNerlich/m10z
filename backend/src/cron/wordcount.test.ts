import {describe, expect, test, vi} from 'vitest';

import {generateMissingWordCounts} from './wordcount';

const PUBLISHED_AT = '2026-04-20T10:00:00.000Z';

type PublishedDoc = {
    documentId: string;
    slug: string;
    content?: string;
    shownotes?: string;
    updatedAt: string;
};

function makeStrapi({
    publishedDocs,
    draft,
    draftLookupError,
}: {
    publishedDocs: PublishedDoc[];
    draft: {updatedAt: string} | null;
    draftLookupError?: Error;
}) {
    const update = vi.fn(() => Promise.resolve({}));
    const publish = vi.fn(() => Promise.resolve({}));
    const findOne = vi.fn(() => (draftLookupError ? Promise.reject(draftLookupError) : Promise.resolve(draft)));
    const findMany = vi.fn((params: {status?: string}) =>
        Promise.resolve(params.status === 'published' ? publishedDocs : []),
    );

    const makeHandler = () => ({findMany, findOne, update, publish});
    const articleHandler = makeHandler();
    const podcastHandler = makeHandler();

    const strapi = {
        documents: vi.fn((uid: string) =>
            uid === 'api::article.article' ? articleHandler : podcastHandler,
        ),
        log: {
            info: vi.fn(),
            debug: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        },
    };

    return {strapi, update, publish, findOne, findMany};
}

describe('generateMissingWordCounts (published backfill)', () => {
    test('publishes after backfill when the draft has no pending changes', async () => {
        const {strapi, update, publish} = makeStrapi({
            publishedDocs: [
                {documentId: 'doc-1', slug: 'my-article', content: 'Hallo Welt', updatedAt: PUBLISHED_AT},
            ],
            draft: {updatedAt: '2026-04-20T09:00:00.000Z'},
        });

        await generateMissingWordCounts({strapi});

        expect(update).toHaveBeenCalledWith({
            documentId: 'doc-1',
            data: {wordCount: 2},
        });
        expect(publish).toHaveBeenCalledWith({documentId: 'doc-1'});
    });

    test('skips publishing when the draft has pending editorial changes', async () => {
        const {strapi, update, publish} = makeStrapi({
            publishedDocs: [
                {documentId: 'doc-1', slug: 'my-article', content: 'Hallo Welt', updatedAt: PUBLISHED_AT},
            ],
            draft: {updatedAt: '2026-04-20T11:00:00.000Z'},
        });

        await generateMissingWordCounts({strapi});

        // wordCount is still written to the draft...
        expect(update).toHaveBeenCalledWith({
            documentId: 'doc-1',
            data: {wordCount: 2},
        });
        // ...but the unapproved draft is never pushed live
        expect(publish).not.toHaveBeenCalled();
    });

    test('skips publishing when no draft version can be resolved', async () => {
        const {strapi, update, publish} = makeStrapi({
            publishedDocs: [
                {documentId: 'doc-1', slug: 'my-article', content: 'Hallo Welt', updatedAt: PUBLISHED_AT},
            ],
            draft: null,
        });

        await generateMissingWordCounts({strapi});

        expect(update).toHaveBeenCalled();
        expect(publish).not.toHaveBeenCalled();
    });

    test('skips publishing when the draft lookup fails (fail safe)', async () => {
        const {strapi, update, publish} = makeStrapi({
            publishedDocs: [
                {documentId: 'doc-1', slug: 'my-article', content: 'Hallo Welt', updatedAt: PUBLISHED_AT},
            ],
            draft: null,
            draftLookupError: new Error('db down'),
        });

        await generateMissingWordCounts({strapi});

        expect(update).toHaveBeenCalled();
        expect(publish).not.toHaveBeenCalled();
    });
});
