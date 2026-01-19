'use client';

import React from 'react';
import Image from 'next/image';
import {toAbsoluteUrl} from '@/src/lib/strapi';
import {umamiEventId} from '@/src/lib/analytics/umami';
import {isImageHostnameAllowed} from '@/src/lib/imageUtils';

export type GalleryImageProps = React.ComponentProps<typeof Image> & {
    caption?: string;
};

/**
 * Render an image suitable for markdown with Fancybox gallery support.
 *
 * Only images from allowed hostnames (as defined in imageUtils.ts) should be
 * routed to this component. It uses the regular Next.js Image component
 * directly for optimized loading and Fancybox lightbox integration.
 */
export function GalleryImage({src, alt = '', style, caption, ...props}: GalleryImageProps) {
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

    const ariaLabel = caption ? `View image: ${alt || caption}` : `View image: ${alt || 'Gallery image'}`;

    const {title, ...restProps} = props;

    return (
        <a
            href={url}
            data-fancybox="article-gallery"
            aria-label={ariaLabel}
            data-caption={caption}
            style={combinedStyle}
        >
            <Image
                src={url}
                alt={alt}
                title={caption ?? title}
                width={props.width ?? 1200}
                height={props.height ?? 675}
                sizes={props.sizes ?? '100vw'}
                {...restProps}
            />
        </a>
    );
}

