'use client';

import React from 'react';
import Image from 'next/image';
import {isImageHostnameAllowed, resolveStrapiImageUrl} from '@/src/lib/image';

export type GalleryImageProps = React.ComponentProps<typeof Image> & {
    caption?: string;
};

/**
 * Render an image suitable for markdown with Fancybox gallery support.
 *
 * Only images from allowed hostnames should reach this component (routed by
 * `Image.tsx`). The allowlist check below is defence-in-depth.
 */
export function GalleryImage({src, alt = '', style, caption, ...props}: GalleryImageProps) {
    if (!src || typeof src !== 'string') return null;

    const url = resolveStrapiImageUrl(src);

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

    const ariaLabel = caption ? `Bild anzeigen: ${alt || caption}` : `Bild anzeigen: ${alt || 'Galeriebild'}`;

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
                sizes={props.sizes ?? '(max-width: 900px) 100vw, 800px'}
                {...restProps}
            />
        </a>
    );
}

