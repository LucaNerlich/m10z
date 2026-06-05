import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

// Hoisted so the vi.mock factories below can reference the spies safely.
const {revalidateTag, revalidatePath, articleSideEffect} = vi.hoisted(() => ({
    revalidateTag: vi.fn(),
    revalidatePath: vi.fn(),
    articleSideEffect: vi.fn(),
}));

vi.mock('next/cache', () => ({revalidateTag, revalidatePath}));
// Mock the side-effects registry so we neither import the real RSS handlers nor
// trigger their scheduler on load — and can assert the side effect fires.
vi.mock('./invalidationSideEffects', () => ({
    INVALIDATION_SIDE_EFFECTS: {article: articleSideEffect},
}));

import {handleInvalidation} from './handleInvalidation';
import {INVALIDATION_TAXONOMY} from './invalidationTaxonomy';

const SECRET = 'test-secret';

function request(opts: {secret?: string; ip?: string} = {}): Request {
    const headers = new Headers();
    if (opts.secret !== undefined) headers.set('x-m10z-invalidation-secret', opts.secret);
    headers.set('x-forwarded-for', opts.ip ?? '10.0.0.1');
    return new Request('https://m10z.de/api/article/invalidate', {method: 'POST', headers});
}

beforeEach(() => {
    vi.stubEnv('FEED_INVALIDATION_TOKEN', SECRET);
    revalidateTag.mockClear();
    revalidatePath.mockClear();
    articleSideEffect.mockClear();
});

afterEach(() => vi.unstubAllEnvs());

describe('handleInvalidation', () => {
    test('401 when the secret is missing or wrong', async () => {
        expect((await handleInvalidation(request({ip: 'a1'}), 'article')).status).toBe(401);
        expect((await handleInvalidation(request({secret: 'nope', ip: 'a2'}), 'article')).status).toBe(401);
        expect(revalidateTag).not.toHaveBeenCalled();
    });

    test('404 for an unknown target (before any revalidation)', async () => {
        const res = await handleInvalidation(request({secret: SECRET, ip: 'b1'}), 'not-a-target');
        expect(res.status).toBe(404);
        expect(revalidateTag).not.toHaveBeenCalled();
    });

    test('200 revalidates every tag and page and fires the side effect', async () => {
        const res = await handleInvalidation(request({secret: SECRET, ip: 'c1'}), 'article');
        expect(res.status).toBe(200);

        const {tags, pages, paths} = INVALIDATION_TAXONOMY.article;
        expect(await res.json()).toEqual({ok: true, revalidated: [...tags, ...pages, ...paths]});
        for (const tag of tags) expect(revalidateTag).toHaveBeenCalledWith(tag, 'max');
        for (const page of pages) expect(revalidatePath).toHaveBeenCalledWith(page, 'page');
        expect(articleSideEffect).toHaveBeenCalledTimes(1);
    });

    test('429 once the per-target/ip rate limit is exceeded', async () => {
        const ip = 'rate-limited';
        let last: Response | undefined;
        for (let i = 0; i < 31; i++) {
            last = await handleInvalidation(request({secret: SECRET, ip}), 'article');
        }
        expect(last?.status).toBe(429);
        expect(last?.headers.get('Retry-After')).toBeTruthy();
    });
});
