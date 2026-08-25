/**
 * The cache-tag vocabulary for Strapi-backed content.
 *
 * Next.js cache tags are matched exactly on revalidation, so the string a fetcher
 * attaches when it *reads* and the string invalidation revalidates when it *writes*
 * must be byte-identical. This module is the single owner of how each tag is built,
 * imported by both the frontend read side (content access, feeds, sitemap, search)
 * and the write side (the invalidate route) — so the two cannot drift apart.
 */

import type {ContentTypeKey} from './contentTypeKeys';

/** The subset of content types that appear in author/category-scoped list pages. */
export type ListableContentType = 'article' | 'podcast';

/** Entity content types exposed through the CMS read API. A subset of ContentTypeKey. */
export type StrapiContentType = 'article' | 'podcast' | 'author' | 'category';

/** Feed surfaces addressed by `feed:` tags. */
export type FeedKind = 'article' | 'audio';

/** Sitemap sections addressed by `sitemap:` tags. */
export type SitemapSection = 'articles' | 'podcasts' | 'authors' | 'categories';

export const ABOUT_TAG = 'strapi:about';
export const ABOUT_PAGE_TAG = 'about';
export const LEGAL_TAG = 'legal';
export const IMPRINT_TAG = 'imprint';
export const PRIVACY_TAG = 'privacy';
export const LEGAL_TAGS = [LEGAL_TAG, IMPRINT_TAG, PRIVACY_TAG] as const;
export const RELATED_CONTENT_TAG = 'related-content';
export const HOME_PAGE_TAG = 'page:home';
export const SEARCH_INDEX_TAG = 'search-index';

export function typeTag(type: ContentTypeKey): string {
    return `strapi:${type}`;
}

export function entityTag(type: ContentTypeKey, slug: string): string {
    return `strapi:${type}:${slug}`;
}

export function listTag(type: ContentTypeKey): string {
    return `strapi:${type}:list`;
}

export function listPageTag(type: ContentTypeKey): string {
    return `strapi:${type}:list:page`;
}

export function bySlugsTag(type: ContentTypeKey): string {
    return `strapi:${type}:by-slugs`;
}

export function authorListTag(contentType: ListableContentType, authorSlug: string): string {
    return `strapi:${contentType}:list:author:${authorSlug}`;
}

export function authorListPageTag(contentType: ListableContentType, authorSlug: string): string {
    return `strapi:${contentType}:list:author:${authorSlug}:page`;
}

export function authorCategoryListTag(
    contentType: ListableContentType,
    authorSlug: string,
    categorySlug: string,
): string {
    return `strapi:${contentType}:list:author:${authorSlug}:category:${categorySlug}`;
}

export function authorCategoryListPageTag(
    contentType: ListableContentType,
    authorSlug: string,
    categorySlug: string,
): string {
    return `strapi:${contentType}:list:author:${authorSlug}:category:${categorySlug}:page`;
}

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
    contentType: ListableContentType;
    authorSlug: string;
    categorySlug?: string;
}): string[] {
    const {contentType, authorSlug, categorySlug} = args;

    const tags: string[] = [
        typeTag(contentType),
        listTag(contentType),
        typeTag('author'),
        entityTag('author', authorSlug),
        authorListTag(contentType, authorSlug),
        authorListPageTag(contentType, authorSlug),
    ];

    if (categorySlug) {
        tags.push(typeTag('category'), entityTag('category', categorySlug));
        tags.push(authorCategoryListTag(contentType, authorSlug, categorySlug));
        tags.push(authorCategoryListPageTag(contentType, authorSlug, categorySlug));
    }

    return tags;
}
