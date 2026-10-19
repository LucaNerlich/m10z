import {beforeEach, describe, expect, test, vi} from 'vitest';

const mocks = vi.hoisted(() => ({duration: 42.4 as number}));

vi.mock('fs', () => ({existsSync: vi.fn(() => true)}));
vi.mock('music-metadata', () => ({
    parseFile: vi.fn(async () => ({format: {duration: mocks.duration}})),
}));

import {existsSync} from 'fs';
import {parseFile} from 'music-metadata';

import {durationMiddleware} from './duration';
import {type PodcastDocument} from '../types/middleware';

const mockedExistsSync = vi.mocked(existsSync);
const mockedParseFile = vi.mocked(parseFile);

/**
 * Strapi's "Duplicate" admin action runs a `clone` document-service action, which merges
 * `context.params.data` into every cloned entry — so the recompute must load the *source*
 * entry (by `context.params.documentId`) and inject the computed value into that same
 * `data` object before `next()` runs the actual clone.
 */
function makeCloneStrapi(sourceEntry: Record<string, unknown> | null) {
    const findOne = vi.fn(async () => sourceEntry);
    const strapi = {
        documents: vi.fn(() => ({findOne})),
        dirs: {public: '/pub'},
        log: {info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn()},
    };
    return {strapi, findOne};
}

beforeEach(() => {
    mockedExistsSync.mockReset();
    mockedExistsSync.mockReturnValue(true);
    mockedParseFile.mockClear();
    mocks.duration = 42.4;
});

describe('durationMiddleware clone handling', () => {
    test('injects duration computed from the source file into data', async () => {
        const {strapi, findOne} = makeCloneStrapi({file: {url: '/uploads/episode.mp3'}});
        const next = vi.fn(async () => ({entries: [{documentId: 'clone-1'}]}));
        const context = {
            uid: 'api::podcast.podcast',
            action: 'clone',
            params: {strapi: strapi as never, documentId: 'source-1'},
        };

        await durationMiddleware(context, next);

        expect(findOne).toHaveBeenCalledWith({documentId: 'source-1', populate: ['file']});
        expect(next).toHaveBeenCalledTimes(1);
        expect(context.params.data).toEqual({duration: 42});
    });

    test('prefers a file override already submitted with the clone over the source file', async () => {
        // The content-manager sends unsaved form edits (e.g. a newly picked file) as the
        // clone's `data` override — that must win, not the source's still-old file.
        const {strapi, findOne} = makeCloneStrapi({file: {url: '/uploads/old-episode.mp3'}});
        const next = vi.fn(async () => ({entries: [{documentId: 'clone-override'}]}));
        const context = {
            uid: 'api::podcast.podcast',
            action: 'clone',
            params: {
                strapi: strapi as never,
                documentId: 'source-override',
                data: {file: {url: '/uploads/new-episode.mp3'}},
            },
        };

        await durationMiddleware(context, next);

        expect(findOne).not.toHaveBeenCalled();
        expect(mockedParseFile).toHaveBeenCalledWith(expect.stringContaining('new-episode.mp3'));
        expect(context.params.data).toEqual({file: {url: '/uploads/new-episode.mp3'}, duration: 42});
    });

    test('preserves any other override fields already present on data', async () => {
        const {strapi} = makeCloneStrapi({file: {url: '/uploads/episode.mp3'}});
        const next = vi.fn(async () => ({entries: [{documentId: 'clone-2'}]}));
        const context = {
            uid: 'api::podcast.podcast',
            action: 'clone',
            params: {strapi: strapi as never, documentId: 'source-2', data: {title: 'Copy'}},
        };

        await durationMiddleware(context, next);

        expect(context.params.data).toEqual({title: 'Copy', duration: 42});
    });

    test('does not write duration when the source entry has no file', async () => {
        const {strapi} = makeCloneStrapi({file: null});
        const next = vi.fn(async () => ({entries: [{documentId: 'clone-3'}]}));
        const context = {
            uid: 'api::podcast.podcast',
            action: 'clone',
            params: {strapi: strapi as never, documentId: 'source-3'},
        };

        await durationMiddleware(context, next);

        expect(context.params.data).toBeUndefined();
    });

    test('ignores clone actions for other content types', async () => {
        const {strapi, findOne} = makeCloneStrapi({file: {url: '/uploads/x.mp3'}});
        const next = vi.fn(async () => ({entries: [{documentId: 'clone-4'}]}));

        await durationMiddleware(
            {uid: 'api::article.article', action: 'clone', params: {strapi: strapi as never}},
            next,
        );

        expect(findOne).not.toHaveBeenCalled();
    });
});

/**
 * The podcast schema declares `duration` as `integer, min: 1` and Strapi validates `min`
 * on publish, so the middleware must never store the rounded value 0.
 */
describe('durationMiddleware duration rounding', () => {
    function makeStrapi(existing: Record<string, unknown> | null = null) {
        return {
            documents: vi.fn(() => ({findOne: vi.fn(async () => existing)})),
            dirs: {public: '/pub'},
            log: {info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn()},
        };
    }

    function makeContext(
        strapi: ReturnType<typeof makeStrapi>,
        data: PodcastDocument,
        options: {action?: string; documentId?: string} = {},
    ) {
        return {
            uid: 'api::podcast.podcast',
            action: options.action ?? 'create',
            params: {
                strapi: strapi as never,
                data,
                documentId: options.documentId,
            },
        };
    }

    test('stores the rounded integer seconds for a normal file', async () => {
        mocks.duration = 42.4;
        const strapi = makeStrapi();
        const data: PodcastDocument = {file: {url: '/uploads/episode.mp3'}};

        await durationMiddleware(makeContext(strapi, data), vi.fn(async () => ({})));

        expect(data.duration).toBe(42);
    });

    test('clears duration when the file rounds to 0 seconds', async () => {
        mocks.duration = 0.4;
        const strapi = makeStrapi();
        const data: PodcastDocument = {file: {url: '/uploads/too-short.mp3'}};

        await durationMiddleware(makeContext(strapi, data), vi.fn(async () => ({})));

        expect(data.duration).toBeNull();
        expect(strapi.log.warn).toHaveBeenCalledWith(
            expect.stringContaining(
                'No usable duration for file: /uploads/too-short.mp3 (metadata duration: 0.4)',
            ),
        );
    });

    test('clears the previous duration when an update replaces the audio with a sub-second file', async () => {
        mocks.duration = 0.4;
        const strapi = makeStrapi({duration: 3540, file: {url: '/uploads/old-episode.mp3'}});
        const data: PodcastDocument = {file: {url: '/uploads/new-episode.mp3'}};

        await durationMiddleware(
            makeContext(strapi, data, {action: 'update', documentId: 'podcast-1'}),
            vi.fn(async () => ({})),
        );

        expect(mockedParseFile).toHaveBeenCalledWith(expect.stringContaining('new-episode.mp3'));
        expect(data.duration).toBeNull();
    });

    test('clears the previous duration when a replacement file cannot be read', async () => {
        mockedExistsSync.mockReturnValue(false);
        const strapi = makeStrapi({duration: 3540, file: {url: '/uploads/old-episode.mp3'}});
        const data: PodcastDocument = {file: {url: '/uploads/missing-episode.mp3'}};

        await durationMiddleware(
            makeContext(strapi, data, {action: 'update', documentId: 'podcast-2'}),
            vi.fn(async () => ({})),
        );

        expect(data.duration).toBeNull();
    });
});
