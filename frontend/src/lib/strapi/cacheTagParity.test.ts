import {describe, expect, test} from 'vitest';

import {CONTENT_TYPE_KEYS, CONTENT_TYPES} from '@/src/lib/shared/contracts/strapi-contract/registry';
import {
    ABOUT_PAGE_TAG,
    ABOUT_TAG,
    buildAuthorPageTags,
    bySlugsTag,
    entityTag,
    IMPRINT_TAG,
    LEGAL_TAGS,
    LEGAL_TAG,
    listPageTag,
    listTag,
    PRIVACY_TAG,
    RELATED_CONTENT_TAG,
    typeTag,
} from '@/src/lib/shared/contracts/strapi-contract/tags';

/**
 * The tags each fetch surface attaches. Kept here (rather than in a module) so
 * the expectation and the check live together: the point of the test is that
 * whatever the read side attaches is covered by the write-side invalidation
 * taxonomy, because Next matches cache tags exactly on revalidation.
 */
const FETCH_TAG_SURFACES = {
    contentBySlug: (type: 'article' | 'podcast' | 'author' | 'category', slug: string) => [
        typeTag(type),
        entityTag(type, slug),
    ],
    contentListPage: (type: 'article' | 'podcast' | 'author' | 'category') => [typeTag(type), listPageTag(type)],
    contentBySlugs: (type: 'article' | 'podcast' | 'author' | 'category') => [typeTag(type), bySlugsTag(type)],
    contentAuthorPage: buildAuthorPageTags,
    relatedContent: (type: 'article' | 'podcast' | 'author' | 'category') => [typeTag(type), RELATED_CONTENT_TAG],
    authorList: () => [typeTag('author'), listTag('author')],
    authorBySlug: (slug: string) => [typeTag('author'), entityTag('author', slug)],
    categoryList: () => [typeTag('category'), listTag('category')],
    categoryBySlug: (slug: string) => [typeTag('category'), entityTag('category', slug)],
    about: () => [ABOUT_TAG, ABOUT_PAGE_TAG],
    imprint: () => [...LEGAL_TAGS],
    privacy: () => [...LEGAL_TAGS],
} as const;

/** Every tag the registry busts on write, across all content types (collection type/list tags + cascadeTags). */
function allInvalidationTags(): Set<string> {
    const tags = new Set<string>();
    for (const key of CONTENT_TYPE_KEYS) {
        const config = CONTENT_TYPES[key];
        if (config.kind === 'collection') {
            tags.add(typeTag(key));
            tags.add(listTag(key));
        }
        for (const tag of config.cascadeTags ?? []) tags.add(tag);
    }
    return tags;
}

describe('cache tag parity', () => {
    const invalidationTags = allInvalidationTags();

    test('each fetch surface has coarse invalidation coverage', () => {
        const surfaces: {name: string; tags: readonly string[]}[] = [
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
        expect(invalidationTags.has(typeTag('article'))).toBe(true);
        expect(invalidationTags.has(listTag('article'))).toBe(true);
        expect(invalidationTags.has(listPageTag('article'))).toBe(false);
        expect(invalidationTags.has(entityTag('article', 'foo'))).toBe(false);
        expect(invalidationTags.has(bySlugsTag('article'))).toBe(false);
    });
});
