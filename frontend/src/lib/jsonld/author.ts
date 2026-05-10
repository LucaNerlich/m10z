import {type Person, type ProfilePage} from './types';
import {authorToPerson} from './helpers';
import {type StrapiAuthor} from '@/src/lib/rss/media';
import {routes} from '@/src/lib/routes';
import {CONTENT_LANGUAGE, OG_SITE_NAME} from '@/src/lib/metadata/constants';

/**
 * Generate a schema.org ProfilePage JSON-LD object for an author profile page.
 *
 * Wraps the author as a Person inside a ProfilePage schema to help search engines
 * understand that this page is about a specific person.
 *
 * @param author - The Strapi author record to build the ProfilePage for
 * @returns A ProfilePage JSON-LD object with the author as mainEntity
 */
export function generateAuthorProfileJsonLd(author: StrapiAuthor): ProfilePage {
    const person: Person = authorToPerson(author);

    return {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        mainEntity: person,
        inLanguage: CONTENT_LANGUAGE,
        isPartOf: {
            '@type': 'WebSite',
            name: OG_SITE_NAME,
            url: routes.siteUrl,
        },
    };
}
