import {type CollectionPage, type ItemListItem} from './types';
import {absoluteRoute, routes} from '@/src/lib/routes';
import {CONTENT_LANGUAGE, OG_SITE_NAME} from '@/src/lib/metadata/constants';

type CategoryJsonLdInput = {
    title: string;
    description?: string;
    slug: string;
    articleSlugs: string[];
    podcastSlugs: string[];
};

/**
 * Generate a schema.org CollectionPage JSON-LD object for a category page.
 *
 * Includes an ItemList of all articles and podcasts belonging to this category.
 *
 * @param input - Category data including title, description, slug, and content slugs
 * @returns A CollectionPage JSON-LD object ready for embedding
 */
export function generateCategoryJsonLd(input: CategoryJsonLdInput): CollectionPage {
    const url = absoluteRoute(routes.category(input.slug));

    const items: ItemListItem[] = [
        ...input.articleSlugs.map((slug, i) => ({
            '@type': 'ListItem' as const,
            position: i + 1,
            url: absoluteRoute(routes.article(slug)),
        })),
        ...input.podcastSlugs.map((slug, i) => ({
            '@type': 'ListItem' as const,
            position: input.articleSlugs.length + i + 1,
            url: absoluteRoute(routes.podcast(slug)),
        })),
    ];

    const result: CollectionPage = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: input.title,
        url,
        inLanguage: CONTENT_LANGUAGE,
        isPartOf: {
            '@type': 'WebSite',
            name: OG_SITE_NAME,
            url: routes.siteUrl,
        },
    };

    if (input.description) {
        result.description = input.description;
    }

    if (items.length > 0) {
        result.mainEntity = {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            itemListElement: items,
        };
    }

    return result;
}
