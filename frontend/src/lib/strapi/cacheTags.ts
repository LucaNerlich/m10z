// The cache-tag vocabulary for Strapi-backed content.
//
// Next.js cache tags are matched exactly on revalidation, so the string a fetcher
// attaches when it *reads* and the string the invalidation taxonomy revalidates when it
// *writes* must be byte-identical. The builders live once in the shared contract
// (`shared/strapi-contract/tags.ts`, mirrored into `src/lib/shared/contracts/`); this
// module is the stable read-side import surface — it re-exports the shared builders
// under the historical `content*` names instead of redeclaring them, so the read side
// (content access, contentFeed, feed handlers, sitemap, search) and the write side
// (invalidation taxonomy) cannot drift to subtly different strings.

import {
    ABOUT_PAGE_TAG,
    ABOUT_TAG,
    buildAuthorPageTags,
    bySlugsTag,
    entityTag,
    feedSourceTag,
    feedTag,
    LEGAL_TAGS,
    listPageTag,
    listTag,
    RELATED_CONTENT_TAG,
    typeTag,
} from '@/src/lib/shared/contracts/strapi-contract/tags';
import type {StrapiContentType} from '@/src/lib/shared/contracts/strapi-contract/tags';

export {
    ABOUT_PAGE_TAG,
    ABOUT_TAG,
    HOME_PAGE_TAG,
    IMPRINT_TAG,
    LEGAL_TAGS,
    LEGAL_TAG,
    PRIVACY_TAG,
    RELATED_CONTENT_TAG,
    SEARCH_INDEX_TAG,
    buildAuthorPageTags,
    feedSourceTag,
    feedTag,
    sitemapTag,
} from '@/src/lib/shared/contracts/strapi-contract/tags';

export {
    bySlugsTag as contentBySlugsTag,
    entityTag as contentItemTag,
    listPageTag as contentListPageTag,
    listTag as contentListTag,
    typeTag as contentTag,
} from '@/src/lib/shared/contracts/strapi-contract/tags';

/** Maps each fetch surface to the tags it attaches — used for invalidation parity tests. */
export const FETCH_TAG_SURFACES = {
    contentBySlug: (type: StrapiContentType, slug: string) => [typeTag(type), entityTag(type, slug)],
    contentListPage: (type: StrapiContentType) => [typeTag(type), listPageTag(type)],
    contentBySlugs: (type: StrapiContentType) => [typeTag(type), bySlugsTag(type)],
    contentAuthorPage: buildAuthorPageTags,
    relatedContent: (type: StrapiContentType) => [typeTag(type), RELATED_CONTENT_TAG],
    authorList: () => [typeTag('author'), listTag('author')],
    authorBySlug: (slug: string) => [typeTag('author'), entityTag('author', slug)],
    categoryList: () => [typeTag('category'), listTag('category')],
    categoryBySlug: (slug: string) => [typeTag('category'), entityTag('category', slug)],
    about: () => [ABOUT_TAG, ABOUT_PAGE_TAG],
    imprint: () => [...LEGAL_TAGS],
    privacy: () => [...LEGAL_TAGS],
    feedsInfo: () => [feedSourceTag('article')],
} as const;
