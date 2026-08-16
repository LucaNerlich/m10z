import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {handleInvalidation} from './handleInvalidation';
import {computeRevalidation} from './computeRevalidation';
import type {InvalidationEvent} from '@/src/lib/shared/strapiContract';

const {revalidateTag, revalidatePath, onInvalidate} = vi.hoisted(() => ({
    revalidateTag: vi.fn(),
    revalidatePath: vi.fn(),
    onInvalidate: vi.fn(),
}));

vi.mock('next/cache', () => ({revalidateTag, revalidatePath}));
vi.mock('@/src/lib/rss/feedRegistry', () => ({feedRegistry: {onInvalidate}}));

const SECRET = 'test-secret';

function request(opts: {secret?: string; ip?: string; body?: unknown} = {}): Request {
    const headers = new Headers({'content-type': 'application/json'});
    if (opts.secret !== undefined) headers.set('x-m10z-invalidation-secret', opts.secret);
    headers.set('x-forwarded-for', opts.ip ?? '10.0.0.1');
    return new Request('https://m10z.de/api/invalidate', {
        method: 'POST',
        headers,
        body: JSON.stringify(opts.body ?? {type: 'article', action: 'publish', slug: 'my-article'}),
    });
}

beforeEach(() => {
    vi.stubEnv('STRAPI_INVALIDATION_SECRET', SECRET);
    revalidateTag.mockClear();
    revalidatePath.mockClear();
    onInvalidate.mockClear();
});

afterEach(() => vi.unstubAllEnvs());

describe('handleInvalidation', () => {
    test('401 when the secret is missing or wrong', async () => {
        expect((await handleInvalidation(request({secret: undefined, ip: 'a1'}))).status).toBe(401);
        expect((await handleInvalidation(request({secret: 'nope', ip: 'a2'}))).status).toBe(401);
        expect(revalidateTag).not.toHaveBeenCalled();
    });

    test('400 for a malformed or unknown-type body', async () => {
        const res = await handleInvalidation(request({secret: SECRET, ip: 'b1', body: {type: 'not-a-type', action: 'update'}}));
        expect(res.status).toBe(400);
        expect(revalidateTag).not.toHaveBeenCalled();
    });

    test('200 revalidates exactly the tags/pages/paths computeRevalidation returns and notifies feedRegistry', async () => {
        const event: InvalidationEvent = {
            type: 'article',
            action: 'publish',
            slug: 'my-article',
            relations: {authors: ['jane'], categories: ['politik']},
        };
        const res = await handleInvalidation(request({secret: SECRET, ip: 'c1', body: event}));
        expect(res.status).toBe(200);

        const {tags, pages, paths} = computeRevalidation(event);
        expect(paths.length).toBeGreaterThan(0);
        expect(await res.json()).toEqual({ok: true, revalidated: [...tags, ...pages, ...paths]});
        for (const tag of tags) expect(revalidateTag).toHaveBeenCalledWith(tag, 'max');
        for (const page of pages) expect(revalidatePath).toHaveBeenCalledWith(page, 'page');
        for (const path of paths) expect(revalidatePath).toHaveBeenCalledWith(path);
        expect(onInvalidate).toHaveBeenCalledWith('article');
    });

    test('400 when relations values are not string arrays', async () => {
        const base = {type: 'article', action: 'publish', slug: 'my-article'};
        const malformedBodies = [
            {...base, relations: {authors: 'jane'}},
            {...base, relations: {authors: [123]}},
            {...base, relations: {authors: [{slug: 'jane'}]}},
            {...base, relations: 'not-an-object'},
            {...base, relations: ['not', 'an', 'object']},
        ];

        for (const body of malformedBodies) {
            const res = await handleInvalidation(request({secret: SECRET, ip: 'd1', body}));
            expect(res.status).toBe(400);
        }
        expect(revalidateTag).not.toHaveBeenCalled();
    });

    test('503 once the per-IP rate limit is exceeded (retryable status for the backend)', async () => {
        const ip = '203.0.113.9';
        let last: Response | undefined;
        for (let i = 0; i < 121; i++) {
            last = await handleInvalidation(request({secret: SECRET, ip}));
        }
        expect(last?.status).toBe(503);
        expect(last?.headers.get('Retry-After')).toBeTruthy();
    });

    test('rate limit applies to unauthenticated requests as well', async () => {
        const ip = '203.0.113.10';
        let last: Response | undefined;
        for (let i = 0; i < 121; i++) {
            last = await handleInvalidation(request({secret: 'nope', ip}));
        }
        expect(last?.status).toBe(503);
        expect(revalidateTag).not.toHaveBeenCalled();
    });
});
