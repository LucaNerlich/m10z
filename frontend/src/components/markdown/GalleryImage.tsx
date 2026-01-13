'use client';

import React from 'react';
import Image from 'next/image';
import {toAbsoluteUrl} from '@/src/lib/strapi';
import {umamiEventId} from '@/src/lib/analytics/umami';
import {isImageHostnameAllowed} from '@/src/lib/imageUtils';

export type GalleryImageProps = React.ComponentProps<typeof Image>;

/**
 * Render an image suitable for markdown with Fancybox gallery support.
 *
 * Only images from allowed hostnames (as defined in imageUtils.ts) should be
 * routed to this component. It uses the regular Next.js Image component
 * directly for optimized loading and Fancybox lightbox integration.
 */
export function GalleryImage({src, alt = '', style, ...props}: GalleryImageProps) {
    if (!src || typeof src !== 'string') return null;

    const url = /^https?:\/\//i.test(src) ? src : toAbsoluteUrl(src);

    // Extra safety: if the hostname is not allowed, fall back to null.
    // Routing logic in Image.tsx should prevent this path normally.
    if (!isImageHostnameAllowed(url)) {
        return null;
    }

    const combinedStyle: React.CSSProperties = {
        display: 'inline-block',
        width: '100%',
        touchAction: 'manipulation',
        cursor: 'pointer',
        ...style,
    };

    return (
        <a
            href={url}
            data-fancybox="article-gallery"
            aria-label={`View image: ${alt || 'Gallery image'}`}
            style={combinedStyle}
            data-umami-event={umamiEventId(['article', 'image', 'open'])}
        >
            <Image
                src={url}
                alt={alt}
                width={props.width ?? 1200}
                height={props.height ?? 675}
                sizes={props.sizes ?? '100vw'}
                {...props}
            />
        </a>
    );
}

