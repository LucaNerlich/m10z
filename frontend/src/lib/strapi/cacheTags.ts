// The cache-tag vocabulary for Strapi-backed content.
//
// Next.js cache tags are matched exactly on revalidation, so the string a fetcher
// attaches when it *reads* and the string the invalidation taxonomy revalidates when it
// *writes* must be byte-identical. This module is the single owner of how each tag is
// built, so the read side (content access, contentFeed, feed handlers, sitemap, search)
// and the write side (invalidationTaxonomy) cannot drift to subtly different strings.

export type StrapiContentType = 'article' | 'podcast' | 'author' | 'category';
export type FeedKind = 'article' | 'audio';
export type SitemapSection = 'articles' | 'podcasts' | 'authors' | 'categories';

export const ABOUT_TAG = 'strapi:about';
export const ABOUT_PAGE_TAG = 'about';
export const LEGAL_TAG = 'legal';
export const IMPRINT_TAG = 'imprint';
export const PRIVACY_TAG = 'privacy';
export const LEGAL_TAGS = [LEGAL_TAG, IMPRINT_TAG, PRIVACY_TAG] as const;

export function contentTag(type: StrapiContentType): string {
    return `strapi:${type}`;
}

export function contentItemTag(type: StrapiContentType, slug: string): string {
    return `strapi:${type}:${slug}`;
}

export function contentListTag(type: StrapiContentType): string {
    return `strapi:${type}:list`;
}

export function contentListPageTag(type: StrapiContentType): string {
    return `strapi:${type}:list:page`;
}

export function contentBySlugsTag(type: StrapiContentType): string {
    return `strapi:${type}:by-slugs`;
}

export function contentAuthorListTag(contentType: 'article' | 'podcast', authorSlug: string): string {
    return `strapi:${contentType}:list:author:${authorSlug}`;
}

export function contentAuthorListPageTag(contentType: 'article' | 'podcast', authorSlug: string): string {
    return `strapi:${contentType}:list:author:${authorSlug}:page`;
}

export function contentAuthorCategoryListTag(
    contentType: 'article' | 'podcast',
    authorSlug: string,
    categorySlug: string,
): string {
    return `strapi:${contentType}:list:author:${authorSlug}:category:${categorySlug}`;
}

export function contentAuthorCategoryListPageTag(
    contentType: 'article' | 'podcast',
    authorSlug: string,
    categorySlug: string,
): string {
    return `strapi:${contentType}:list:author:${authorSlug}:category:${categorySlug}:page`;
}

export const RELATED_CONTENT_TAG = 'related-content';
export const HOME_PAGE_TAG = 'page:home';
export const SEARCH_INDEX_TAG = 'search-index';

export function feedTag(kind: FeedKind): string {
    return `feed:${kind}`;
}

export function feedSourceTag(kind: FeedKind): string {
    return kind === 'article' ? 'strapi:article-feed' : 'strapi:audio-feed';
}

export function sitemapTag(section: SitemapSection): string {
    return `sitemap:${section}`;
}

export function buildAuthorPageTags(args: {
    contentType: 'article' | 'podcast';
    authorSlug: string;
    categorySlug?: string;
}): string[] {
    const {contentType, authorSlug, categorySlug} = args;

    const tags: string[] = [
        contentTag(contentType),
        contentListTag(contentType),
        contentTag('author'),
        contentItemTag('author', authorSlug),
        contentAuthorListTag(contentType, authorSlug),
        contentAuthorListPageTag(contentType, authorSlug),
    ];

    if (categorySlug) {
        tags.push(contentTag('category'), contentItemTag('category', categorySlug));
        tags.push(contentAuthorCategoryListTag(contentType, authorSlug, categorySlug));
        tags.push(contentAuthorCategoryListPageTag(contentType, authorSlug, categorySlug));
    }

    return tags;
}

/** Maps each fetch surface to the tags it attaches — used for invalidation parity tests. */
export const FETCH_TAG_SURFACES = {
    contentBySlug: (type: StrapiContentType, slug: string) => [contentTag(type), contentItemTag(type, slug)],
    contentListPage: (type: StrapiContentType) => [contentTag(type), contentListPageTag(type)],
    contentBySlugs: (type: StrapiContentType) => [contentTag(type), contentBySlugsTag(type)],
    contentAuthorPage: buildAuthorPageTags,
    relatedContent: (type: StrapiContentType) => [contentTag(type), RELATED_CONTENT_TAG],
    authorList: () => [contentTag('author'), contentListTag('author')],
    authorBySlug: (slug: string) => [contentTag('author'), contentItemTag('author', slug)],
    categoryList: () => [contentTag('category'), contentListTag('category')],
    categoryBySlug: (slug: string) => [contentTag('category'), contentItemTag('category', slug)],
    about: () => [ABOUT_TAG, ABOUT_PAGE_TAG],
    imprint: () => [...LEGAL_TAGS],
    privacy: () => [...LEGAL_TAGS],
    feedsInfo: () => [feedSourceTag('article')],
} as const;
