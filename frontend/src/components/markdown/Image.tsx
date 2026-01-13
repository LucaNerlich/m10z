'use client';

import React from 'react';
import {toAbsoluteUrl} from '@/src/lib/strapi';
import {isImageHostnameAllowed} from '@/src/lib/imageUtils';
import {GalleryImage} from './GalleryImage';
import {PlainImage} from './PlainImage';

export type ImageProps = React.ComponentProps<'img'>;

/**
 * Route markdown images between gallery-enabled and plain display.
 *
 * - Authorized image hostnames (as defined in imageUtils.ts) use GalleryImage,
 *   which integrates with Fancybox via data-fancybox attributes.
 * - External/unauthorized hostnames use PlainImage, a simple SafeImage wrapper
 *   without any Fancybox behavior.
 *
 * @param src - Image source URL or path; if missing or not a string, the component returns `null`
 * @param alt - Alternate text for the image (defaults to an empty string)
 */
export function Image({src, alt = ''}: ImageProps) {
    if (!src || typeof src !== 'string') return null;

    const url = /^https?:\/\//i.test(src) ? src : toAbsoluteUrl(src);

    const isAllowed = isImageHostnameAllowed(url);

    if (isAllowed) {
        return <GalleryImage src={url} alt={alt} />;
    }

    return <PlainImage src={url} alt={alt} />;
}
