import {describe, expect, test} from 'vitest';

import {
    authorCategoryListTag,
    authorListTag,
    CONTENT_TYPE_KEYS,
    entityTag,
    listTag,
    typeTag,
} from '@/src/lib/shared/strapiContract';
import {HOME_PAGE_TAG, RELATED_CONTENT_TAG} from '@/src/lib/strapi/cacheTags';

import {computeRevalidation} from './computeRevalidation';

describe('computeRevalidation', () => {
    test('article publish busts type/list/entity tags plus cascade tags', () => {
        const {tags, pages, paths} = computeRevalidation({type: 'article', action: 'publish', slug: 'my-article'});

        expect(tags).toEqual(
            expect.arrayContaining([
                typeTag('article'),
                listTag('article'),
                entityTag('article', 'my-article'),
                HOME_PAGE_TAG,
            ]),
        );
        expect(pages).toContain('/artikel');
        expect(paths).toContain('/artikel/my-article');
    });

    test('never hard-expires every detail page, only the changed entity path', () => {
        for (const type of CONTENT_TYPE_KEYS) {
            const {pages} = computeRevalidation({type, action: 'update', slug: 'x'});
            expect(pages).not.toContain('/artikel/[slug]');
            expect(pages).not.toContain('/podcasts/[slug]');
        }
        expect(computeRevalidation({type: 'podcast', action: 'unpublish', slug: 'ep'}).paths).toContain(
            '/podcasts/ep'
        );
    });

    // Detail pages are cached under the type tags of fetchArticleBySlug/fetchPodcastBySlug
    // and the related-content tag of fetchRelated*, so these must be stale-marked instead.
    test.each([
        ['article', [typeTag('article'), RELATED_CONTENT_TAG]],
        ['podcast', [typeTag('podcast'), RELATED_CONTENT_TAG]],
        ['author', [typeTag('article'), typeTag('podcast')]],
        ['category', [typeTag('article'), typeTag('podcast')]],
    ] as const)('%s events stale-mark the tags detail pages are cached under', (type, expected) => {
        const {tags} = computeRevalidation({type, action: 'update', slug: 'x'});
        expect(tags).toEqual(expect.arrayContaining([...expected]));
    });

    test('podcast publish busts the homepage cache tag', () => {
        const {tags} = computeRevalidation({type: 'podcast', action: 'publish', slug: 'my-podcast'});

        expect(tags).toContain(HOME_PAGE_TAG);
    });

    test('article publish with author/category relations busts the precise scoped list tags', () => {
        const {tags} = computeRevalidation({
            type: 'article',
            action: 'publish',
            slug: 'my-article',
            relations: {authors: ['jane'], categories: ['politik']},
        });

        expect(tags).toContain(entityTag('author', 'jane'));
        expect(tags).toContain(entityTag('category', 'politik'));
        expect(tags).toContain(authorListTag('article', 'jane'));
        expect(tags).toContain(authorCategoryListTag('article', 'jane', 'politik'));
    });

    test('single types (about) never get an auto-generated list tag, only cascadeTags', () => {
        const {tags} = computeRevalidation({type: 'about', action: 'update'});

        // 'strapi:about:list' is never attached by any fetcher (about has no listing page) —
        // unlike collection types, single types rely solely on their declared cascadeTags.
        expect(tags).not.toContain(listTag('about'));
        expect(tags).toEqual(['strapi:about', 'about']);
    });

    test('synthetic types (search-index, sitemap) only apply their cascadeTags', () => {
        const searchIndex = computeRevalidation({type: 'search-index', action: 'update'});
        expect(searchIndex.tags).toEqual(['search-index']);

        const sitemap = computeRevalidation({type: 'sitemap', action: 'update'});
        expect(sitemap.paths).toEqual(expect.arrayContaining(['/sitemap.xml', '/sitemap']));
    });

    test('category edit busts article and podcast list tags but not their entity tags', () => {
        const {tags} = computeRevalidation({type: 'category', action: 'update', slug: 'politik'});

        expect(tags).toContain(listTag('article'));
        expect(tags).toContain(listTag('podcast'));
        expect(tags).toContain(entityTag('category', 'politik'));
    });
});
