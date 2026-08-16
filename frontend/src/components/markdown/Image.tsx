'use client';

import React from 'react';
import {isImageHostnameAllowed, resolveStrapiImageUrl} from '@/src/lib/image';
import {GalleryImage} from './GalleryImage';
import {PlainImage} from './PlainImage';

export type ImageProps = React.ComponentProps<'img'>;

/**
 * Route markdown images between gallery-enabled and plain display.
 *
 * - Authorized image hostnames (allowlist in `lib/image/hostnames.ts`) render
 *   via `GalleryImage` with Fancybox integration.
 * - External/unauthorized hostnames render via `PlainImage`.
 *
 * @param src - Image source URL or path; if missing or not a string, the component returns `null`
 * @param alt - Alternate text for the image (defaults to an empty string)
 */
export function Image({src, alt = '', title}: ImageProps) {
    if (!src || typeof src !== 'string') return null;

    let url: string;
    try {
        url = resolveStrapiImageUrl(src);
    } catch {
        // STRAPI_URL (or NEXT_PUBLIC_STRAPI_URL) is unset, so relative media
        // URLs cannot be resolved. Render the unoptimized path instead of
        // crashing the whole article through the error boundary.
        return <img src={src} alt={alt} title={title} />;
    }

    if (isImageHostnameAllowed(url)) {
        return <GalleryImage src={url} alt={alt} caption={title} title={title} />;
    }

    return <PlainImage src={url} alt={alt} title={title} />;
}
