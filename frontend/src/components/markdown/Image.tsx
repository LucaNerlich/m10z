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

    const url = resolveStrapiImageUrl(src);

    if (isImageHostnameAllowed(url)) {
        return <GalleryImage src={url} alt={alt} caption={title} title={title} />;
    }

    return <PlainImage src={url} alt={alt} title={title} />;
}
