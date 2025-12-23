import {type Organization} from './types';
import {buildImageObject} from './helpers';
import {absoluteRoute, routes} from '@/src/lib/routes';

/**
 * Generates Organization JSON-LD schema for the site.
 */
export function generateOrganizationJsonLd(): Organization {
    const logoUrl = absoluteRoute('/logo.svg');

    const sameAs: string[] = [
        routes.youtube,
        routes.twitch,
        routes.discord,
        routes.forum,
        routes.linktree,
    ].filter(Boolean) as string[];

    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Mindestens 10 Zeichen',
        alternateName: 'M10Z',
        url: routes.siteUrl,
        logo: buildImageObject(logoUrl),
        sameAs: sameAs.length > 0 ? sameAs : undefined,
    };
}

