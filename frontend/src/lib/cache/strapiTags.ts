// The cache-tag vocabulary for Strapi-backed content.
//
// Next.js cache tags are matched exactly on revalidation, so the string a fetcher
// attaches when it *reads* and the string the invalidation taxonomy revalidates when it
// *writes* must be byte-identical. This module is the single owner of how each tag is
// built, so the read side (strapiContent, contentFeed, feed handlers, sitemap, search)
// and the write side (invalidationTaxonomy) cannot drift to subtly different strings.

export type StrapiContentType = 'article' | 'podcast' | 'author' | 'category';
export type FeedKind = 'article' | 'audio';
export type SitemapSection = 'articles' | 'podcasts' | 'authors' | 'categories';

// Everything of a content type (coarsest invalidation).
export function contentTag(type: StrapiContentType): string {
    return `strapi:${type}`;
}

// A single entity, addressed by slug.
export function contentItemTag(type: StrapiContentType, slug: string): string {
    return `strapi:${type}:${slug}`;
}

// All lists of a content type.
export function contentListTag(type: StrapiContentType): string {
    return `strapi:${type}:list`;
}

// Paginated list pages.
export function contentListPageTag(type: StrapiContentType): string {
    return `strapi:${type}:list:page`;
}

// A by-slugs batch read.
export function contentBySlugsTag(type: StrapiContentType): string {
    return `strapi:${type}:by-slugs`;
}

// Related-content sidebars share one tag across content types.
export const RELATED_CONTENT_TAG = 'related-content';

// The composed home page.
export const HOME_PAGE_TAG = 'page:home';

// The search index.
export const SEARCH_INDEX_TAG = 'search-index';

// The rendered RSS / audio feed document.
export function feedTag(kind: FeedKind): string {
    return `feed:${kind}`;
}

// The Strapi single-type that backs a feed's channel config.
export function feedSourceTag(kind: FeedKind): string {
    return kind === 'article' ? 'strapi:article-feed' : 'strapi:audio-feed';
}

// A sitemap section.
export function sitemapTag(section: SitemapSection): string {
    return `sitemap:${section}`;
}

// Hierarchical tags for an author's content-listing page: base type → list → author →
// optional category. Each level is a distinct tag enabling coarse-to-fine invalidation
// (e.g. invalidate all articles vs. only one author's articles in one category).
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
        `strapi:${contentType}:list:author:${authorSlug}`,
        `strapi:${contentType}:list:author:${authorSlug}:page`,
    ];

    if (categorySlug) {
        tags.push(contentTag('category'), contentItemTag('category', categorySlug));
        tags.push(`strapi:${contentType}:list:author:${authorSlug}:category:${categorySlug}`);
        tags.push(`strapi:${contentType}:list:author:${authorSlug}:category:${categorySlug}:page`);
    }

    return tags;
}
