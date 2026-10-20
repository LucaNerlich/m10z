import {type Metadata} from 'next';

import {absoluteRoute, routes} from '@/src/lib/routes';
import {FEED_ALTERNATES_TYPES, OG_LOCALE, OG_SITE_NAME} from './constants';

const STATIC_OG_IMAGE_PATH = '/images/m10z.jpg';
// The static share image is a 3000x3000 square (see public/images/m10z.jpg);
// declaring 1200x630 made scrapers crop/ignore the hint.
const STATIC_OG_IMAGE_WIDTH = 3000;
const STATIC_OG_IMAGE_HEIGHT = 3000;

type StaticListMetadataInput = {
    /** Page title used for `<title>` (templated by root layout). Omit for the homepage. */
    title?: string;
    description: string;
    /** Absolute or root-relative path used for canonical and OG URL. */
    path: string;
    /** Alt text for the static `/images/m10z.jpg` OG image. */
    ogImageAlt: string;
    /** Optional `og:type` override. Defaults to `'website'`. */
    ogType?: 'website' | 'article' | 'profile';
};

/**
 * Build the standard Metadata block for static list / info pages so they share
 * one source of truth for OpenGraph, Twitter Card, canonical URL, and the static
 * fallback share image. Each page still overrides `title`/`description`/`path`/`alt`
 * with its own copy.
 */
export function buildStaticListMetadata({
                                            title,
                                            description,
                                            path,
                                            ogImageAlt,
                                            ogType = 'website',
                                        }: StaticListMetadataInput): Metadata {
    const url = absoluteRoute(path);
    const image = {
        url: absoluteRoute(STATIC_OG_IMAGE_PATH),
        width: STATIC_OG_IMAGE_WIDTH,
        height: STATIC_OG_IMAGE_HEIGHT,
        alt: ogImageAlt,
    };

    const metadata: Metadata = {
        description,
        openGraph: {
            type: ogType,
            locale: OG_LOCALE,
            siteName: OG_SITE_NAME,
            url,
            title: title ?? OG_SITE_NAME,
            description,
            images: [image],
        },
        twitter: {
            card: 'summary_large_image',
            site: routes.twitter,
            title: title ?? OG_SITE_NAME,
            description,
            images: [image.url],
        },
        alternates: {
            canonical: url,
            types: FEED_ALTERNATES_TYPES,
        },
    };

    if (title) {
        metadata.title = title;
    }

    return metadata;
}
