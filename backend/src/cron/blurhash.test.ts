import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

vi.mock('../utils/generateBlurhash', () => ({
    generateBlurDataUrl: vi.fn(async () => 'data:image/png;base64,AAAA'),
}));

import {generateMissingBlurhashes} from './blurhash';

let publicDir: string;

function strapiWith(files: Array<{documentId?: string; id?: number; url?: string}>) {
    const update = vi.fn(async () => ({}));
    const findMany = vi.fn(async () => files);
    const log = {info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn()};
    return {
        strapi: {
            documents: vi.fn(() => ({findMany, update})),
            dirs: {public: publicDir},
            log,
        },
        findMany,
        update,
    };
}

beforeEach(async () => {
    publicDir = await mkdtemp(join(tmpdir(), 'blurhash-test-'));
    await mkdir(join(publicDir, 'uploads'), {recursive: true});
});

afterEach(async () => {
    await rm(publicDir, {recursive: true, force: true});
});

describe('generateMissingBlurhashes', () => {
    test('scans newest-first so failing rows cannot starve new uploads', async () => {
        const {strapi, findMany} = strapiWith([]);

        await generateMissingBlurhashes({strapi: strapi as never});

        expect(findMany).toHaveBeenCalledWith(
            expect.objectContaining({sort: 'createdAt:desc', limit: 50, start: 0}),
        );
    });

    test('generates and stores a blurhash for a readable image', async () => {
        await writeFile(join(publicDir, 'uploads', 'cover.png'), 'not-a-real-png');
        const {strapi, update} = strapiWith([
            {documentId: 'doc-1', url: '/uploads/cover.png'},
        ]);

        await generateMissingBlurhashes({strapi: strapi as never});

        expect(update).toHaveBeenCalledWith({
            documentId: 'doc-1',
            data: {blurhash: 'data:image/png;base64,AAAA'},
        });
    });

    test('skips a missing file instead of reading or updating it', async () => {
        const {strapi, update} = strapiWith([
            {documentId: 'doc-2', url: '/uploads/missing.png'},
        ]);

        await generateMissingBlurhashes({strapi: strapi as never});

        expect(update).not.toHaveBeenCalled();
    });
});
