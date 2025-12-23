import {type WebSite} from './types';
import {routes} from '@/src/lib/routes';

/**
 * Generates a WebSite JSON-LD object that includes a SearchAction for site search.
 *
 * @returns A WebSite JSON-LD object containing `@context`, `@type` "WebSite", `name`, `url` (from routes.siteUrl), and a `potentialAction` describing a `SearchAction` with an `EntryPoint` `urlTemplate` for search queries.
 */
export function generateWebsiteJsonLd(): WebSite {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Mindestens 10 Zeichen',
        url: routes.siteUrl,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${routes.siteUrl}/api/search-index?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    };
}
