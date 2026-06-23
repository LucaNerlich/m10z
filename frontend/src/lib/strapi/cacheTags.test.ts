import {describe, expect, test} from 'vitest';

import {INVALIDATION_TAXONOMY} from '@/src/lib/cache/invalidationTaxonomy';
import {
    ABOUT_PAGE_TAG,
    ABOUT_TAG,
    buildAuthorPageTags,
    contentBySlugsTag,
    contentItemTag,
    contentListPageTag,
    contentListTag,
    contentTag,
    FETCH_TAG_SURFACES,
    LEGAL_TAGS,
} from './cacheTags';

function allInvalidationTags(): Set<string> {
    const tags = new Set<string>();
    for (const entry of Object.values(INVALIDATION_TAXONOMY)) {
        for (const tag of entry.tags) {
            tags.add(tag);
        }
    }
    return tags;
}

describe('cache tag parity', () => {
    const invalidationTags = allInvalidationTags();

    test('each fetch surface has coarse invalidation coverage', () => {
        const surfaces: {name: string; tags: string[]}[] = [
            {name: 'contentBySlug', tags: FETCH_TAG_SURFACES.contentBySlug('article', 'foo')},
            {name: 'contentListPage', tags: FETCH_TAG_SURFACES.contentListPage('article')},
            {name: 'contentBySlugs', tags: FETCH_TAG_SURFACES.contentBySlugs('podcast')},
            {
                name: 'contentAuthorPage',
                tags: FETCH_TAG_SURFACES.contentAuthorPage({contentType: 'article', authorSlug: 'alice'}),
            },
            {name: 'relatedContent', tags: FETCH_TAG_SURFACES.relatedContent('article')},
            {name: 'authorList', tags: FETCH_TAG_SURFACES.authorList()},
            {name: 'authorBySlug', tags: FETCH_TAG_SURFACES.authorBySlug('alice')},
            {name: 'categoryList', tags: FETCH_TAG_SURFACES.categoryList()},
            {name: 'categoryBySlug', tags: FETCH_TAG_SURFACES.categoryBySlug('news')},
            {name: 'about', tags: FETCH_TAG_SURFACES.about()},
            {name: 'imprint', tags: FETCH_TAG_SURFACES.imprint()},
        ];

        for (const surface of surfaces) {
            expect(
                surface.tags.some((tag) => invalidationTags.has(tag)),
                `${surface.name} has no invalidation coverage`,
            ).toBe(true);
        }
    });

    test('buildAuthorPageTags uses named builders', () => {
        const tags = buildAuthorPageTags({contentType: 'article', authorSlug: 'alice', categorySlug: 'news'});
        expect(tags).toContain('strapi:article:list:author:alice');
        expect(tags).toContain('strapi:article:list:author:alice:category:news:page');
    });

    test('legal and about tags match invalidation taxonomy', () => {
        expect(INVALIDATION_TAXONOMY.about.tags).toEqual(expect.arrayContaining([ABOUT_TAG, ABOUT_PAGE_TAG]));
        expect(INVALIDATION_TAXONOMY.legal.tags).toEqual(expect.arrayContaining([...LEGAL_TAGS]));
    });

    test('coarse tags subsume fine-grained list tags', () => {
        expect(invalidationTags.has(contentTag('article'))).toBe(true);
        expect(invalidationTags.has(contentListTag('article'))).toBe(true);
        expect(invalidationTags.has(contentListPageTag('article'))).toBe(false);
        expect(invalidationTags.has(contentItemTag('article', 'foo'))).toBe(false);
        expect(invalidationTags.has(contentBySlugsTag('article'))).toBe(false);
    });
});
