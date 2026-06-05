import {type WebSite} from './types';
import {routes} from '@/src/lib/routes';

export function generateWebsiteJsonLd(): WebSite {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Mindestens 10 Zeichen',
        url: routes.siteUrl,
    };
}
