import {routes} from '@/src/lib/routes';
import {
    buildAuthorPageTags,
    CONTENT_TYPES,
    entityTag,
    listTag,
    type ContentTypeKey,
    type InvalidationEvent,
    type ListableContentType,
    typeTag,
} from '@/src/lib/shared/strapiContract';

export type Revalidation = {tags: string[]; pages: string[]; paths: string[]};

function isListable(type: ContentTypeKey): type is ListableContentType {
    return type === 'article' || type === 'podcast';
}

function pagesForType(type: ContentTypeKey, slug: string | undefined): {pages: string[]; paths: string[]} {
    switch (type) {
        case 'article':
            return {
                pages: [routes.articles, `${routes.articles}/[slug]`, routes.home, routes.categories, `${routes.categories}/[slug]`],
                paths: [...(slug ? [routes.article(slug)] : []), routes.articleFeed, '/sitemap.xml', '/sitemap'],
            };
        case 'podcast':
            return {
                pages: [routes.podcasts, `${routes.podcasts}/[slug]`, routes.home, routes.categories, `${routes.categories}/[slug]`],
                paths: [...(slug ? [routes.podcast(slug)] : []), routes.audioFeed, '/sitemap.xml', '/sitemap'],
            };
        case 'author':
            return {
                pages: [
                    routes.articles,
                    `${routes.articles}/[slug]`,
                    routes.podcasts,
                    `${routes.podcasts}/[slug]`,
                    `${routes.authors}/[slug]`,
                    routes.home,
                ],
                paths: [],
            };
        case 'category':
            return {
                pages: [routes.categories, `${routes.categories}/[slug]`, routes.articles, routes.podcasts, routes.home],
                paths: [],
            };
        case 'about':
            return {pages: [routes.about], paths: []};
        case 'imprint':
        case 'privacy':
            return {pages: [], paths: [routes.imprint, routes.privacy]};
        case 'article-feed':
            return {
                pages: [routes.home, routes.articles, `${routes.articles}/[slug]`, routes.categories, `${routes.categories}/[slug]`],
                paths: [routes.articleFeed],
            };
        case 'audio-feed':
            return {
                pages: [routes.home, routes.podcasts, `${routes.podcasts}/[slug]`, routes.categories, `${routes.categories}/[slug]`],
                paths: [routes.audioFeed],
            };
        case 'search-index':
            return {pages: [], paths: []};
        case 'sitemap':
            return {pages: [], paths: ['/sitemap.xml', '/sitemap']};
    }
}

/**
 * Compute exactly which cache tags and pages an invalidation event should bust.
 *
 * Pure and side-effect-free so it's trivially testable; `handleInvalidation` is the
 * only caller that actually invokes `revalidateTag`/`revalidatePath`.
 */
export function computeRevalidation(event: InvalidationEvent): Revalidation {
    const config = CONTENT_TYPES[event.type];
    const tags = new Set<string>();

    if (config.kind === 'collection') {
        tags.add(typeTag(event.type));
        tags.add(listTag(event.type));
        if (event.slug) tags.add(entityTag(event.type, event.slug));
    }

    for (const tag of config.cascadeTags ?? []) {
        tags.add(tag);
    }

    if (event.relations && isListable(event.type)) {
        const authorSlugs = event.relations.authors ?? [];
        const categorySlugs = event.relations.categories ?? [];

        for (const categorySlug of categorySlugs) {
            tags.add(entityTag('category', categorySlug));
        }

        for (const authorSlug of authorSlugs) {
            tags.add(entityTag('author', authorSlug));
            // Reuses the exact same builder the read side calls when it attaches tags to an
            // author/category-scoped listing fetch, so the two sides cannot drift apart.
            for (const tag of buildAuthorPageTags({contentType: event.type, authorSlug})) {
                tags.add(tag);
            }
            for (const categorySlug of categorySlugs) {
                for (const tag of buildAuthorPageTags({contentType: event.type, authorSlug, categorySlug})) {
                    tags.add(tag);
                }
            }
        }
    }

    const {pages, paths} = pagesForType(event.type, event.slug);
    return {tags: [...tags], pages, paths};
}
