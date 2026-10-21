/**
 * Shared constants for OpenGraph metadata configuration.
 *
 * These constants centralize OpenGraph locale and site name values
 * to ensure consistency across all pages and avoid duplication.
 */

import {type Metadata} from 'next';

/**
 * OpenGraph locale identifier.
 * Used for the `og:locale` meta tag. Open Graph defines the value as
 * `language_TERRITORY`, so a bare `de` is dropped by strict consumers.
 */
export const OG_LOCALE = 'de_DE' as const;

/**
 * OpenGraph site name.
 * Used for the `og:site_name` meta tag.
 */
export const OG_SITE_NAME = 'Mindestens 10 Zeichen' as const;

/**
 * Feed autodiscovery links.
 *
 * Next resolves metadata shallowly: a page that sets `alternates` replaces the
 * layout's whole object, so every page-level helper must repeat these.
 */
export const FEED_ALTERNATES_TYPES: NonNullable<Metadata['alternates']>['types'] = {
    'application/rss+xml': [
        {url: '/rss.xml', title: 'M10Z Artikel-Feed'},
        {url: '/audiofeed.xml', title: 'M10Z Audio-Feed'},
    ],
};

/**
 * BCP 47 language tag used by JSON-LD `inLanguage` properties.
 * Distinct from `OG_LOCALE` ('de_DE'), which follows the OpenGraph
 * `language_TERRITORY` format.
 */
export const CONTENT_LANGUAGE = 'de-DE' as const;

