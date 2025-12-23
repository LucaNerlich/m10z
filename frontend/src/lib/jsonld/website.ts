import {type WebSite} from './types';
import {routes} from '@/src/lib/routes';

/**
 * Generates WebSite JSON-LD schema with SearchAction for search functionality.
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

