import {describe, expect, test} from 'vitest';

import {CONTENT_TYPE_KEYS, CONTENT_TYPES} from '@/src/lib/shared/strapiContract';
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
    IMPRINT_TAG,
    LEGAL_TAG,
    PRIVACY_TAG,
} from './cacheTags';

/** Every tag the registry busts on write, across all content types (collection type/list tags + cascadeTags). */
function allInvalidationTags(): Set<string> {
    const tags = new Set<string>();
    for (const key of CONTENT_TYPE_KEYS) {
        const config = CONTENT_TYPES[key];
        if (config.kind === 'collection') {
            tags.add(contentTag(key as Parameters<typeof contentTag>[0]));
            tags.add(contentListTag(key as Parameters<typeof contentListTag>[0]));
        }
        for (const tag of config.cascadeTags ?? []) tags.add(tag);
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

    test('legal and about tags match the registry', () => {
        expect(CONTENT_TYPES.about.cascadeTags).toEqual(expect.arrayContaining([ABOUT_TAG, ABOUT_PAGE_TAG]));
        expect(CONTENT_TYPES.imprint.cascadeTags).toEqual(expect.arrayContaining([LEGAL_TAG, IMPRINT_TAG]));
        expect(CONTENT_TYPES.privacy.cascadeTags).toEqual(expect.arrayContaining([LEGAL_TAG, PRIVACY_TAG]));
    });

    test('coarse tags subsume fine-grained list tags', () => {
        expect(invalidationTags.has(contentTag('article'))).toBe(true);
        expect(invalidationTags.has(contentListTag('article'))).toBe(true);
        expect(invalidationTags.has(contentListPageTag('article'))).toBe(false);
        expect(invalidationTags.has(contentItemTag('article', 'foo'))).toBe(false);
        expect(invalidationTags.has(contentBySlugsTag('article'))).toBe(false);
    });
});
