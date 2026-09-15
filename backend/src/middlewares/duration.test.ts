import {beforeEach, describe, expect, test, vi} from 'vitest';

vi.mock('fs', () => ({existsSync: vi.fn(() => true)}));
vi.mock('music-metadata', () => ({parseFile: vi.fn(async () => ({format: {duration: 42.4}}))}));

import {existsSync} from 'fs';
import {parseFile} from 'music-metadata';

import {durationMiddleware} from './duration';

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
    mockedExistsSync.mockClear();
    mockedParseFile.mockClear();
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
