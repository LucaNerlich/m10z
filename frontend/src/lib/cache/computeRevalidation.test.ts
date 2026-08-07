import {describe, expect, test} from 'vitest';

import {computeRevalidation} from './computeRevalidation';
import {authorCategoryListTag, authorListTag, entityTag, listTag, typeTag} from '@/src/lib/shared/strapiContract';

describe('computeRevalidation', () => {
    test('article publish busts type/list/entity tags plus cascade tags', () => {
        const {tags, pages, paths} = computeRevalidation({type: 'article', action: 'publish', slug: 'my-article'});

        expect(tags).toEqual(
            expect.arrayContaining([typeTag('article'), listTag('article'), entityTag('article', 'my-article')]),
        );
        expect(pages).toEqual(expect.arrayContaining(['/artikel', '/artikel/[slug]']));
        expect(paths).toContain('/artikel/my-article');
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
