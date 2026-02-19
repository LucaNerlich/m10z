import {type SearchRecord} from './types';

/**
 * Returns hardcoded search records for static pages that are not indexed from Strapi.
 * These pages exist in the app directory but aren't part of the CMS content types.
 */
export function getStaticPageRecords(): SearchRecord[] {
    return [
        {
            id: 'page:m12g',
            type: 'page',
            slug: 'm12g',
            title: 'M12G Statistik',
            description: 'Monatliche Community-Abstimmungen zu M12G mit den jeweiligen Gewinnern.',
            content: 'Mindestens 12 Games Statistik M12G Community Abstimmungen Gewinner Leaderboard',
            href: '/m12g',
            tags: ['Seite', 'M12G', 'Community', 'Statistik', 'Games'],
        },
        {
            id: 'page:impressum',
            type: 'page',
            slug: 'impressum',
            title: 'Impressum',
            description: 'Impressum von Mindestens 10 Zeichen. Angaben gemäß § 5 TMG über den Anbieter dieser Website.',
            href: '/impressum',
            tags: ['Seite', 'Impressum', 'Rechtliches'],
        },
        {
            id: 'page:datenschutz',
            type: 'page',
            slug: 'datenschutz',
            title: 'Datenschutz',
            description: 'Datenschutzerklärung von Mindestens 10 Zeichen. Informationen zur Erhebung, Verarbeitung und Nutzung Ihrer personenbezogenen Daten.',
            href: '/datenschutz',
            tags: ['Seite', 'Datenschutz', 'Rechtliches'],
        },
        {
            id: 'page:ueber-uns',
            type: 'page',
            slug: 'ueber-uns',
            title: 'Über uns',
            description: 'Von und mit Mindestens 10 Zeichen. Wer wir sind und was wir machen.',
            href: '/ueber-uns',
            tags: ['Seite', 'Über uns', 'Team'],
        },
        {
            id: 'page:feeds',
            type: 'page',
            slug: 'feeds',
            title: 'RSS-Feeds',
            description: 'RSS-Feeds von Mindestens 10 Zeichen. Abonnieren Sie unsere Artikel und Podcasts über RSS-Feeds.',
            href: '/feeds',
            tags: ['Seite', 'RSS', 'Feeds'],
        },
    ];
}