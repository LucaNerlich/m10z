import React from 'react';
import {toAbsoluteUrl} from '@/src/lib/strapi';
import {SafeImage} from '@/src/components/SafeImage';

export type ImageProps = React.ComponentProps<'img'>;

/**
 * Image component for markdown content with Fancybox gallery support.
 * Wraps images in a link for gallery functionality and uses SafeImage
 * for secure image handling.
 */
export function Image({src, alt = '', ...props}: ImageProps) {
    if (!src || typeof src !== 'string') return null;

    const url = /^https?:\/\//i.test(src) ? src : toAbsoluteUrl(src);

    // Use sensible defaults; Next/Image needs concrete dimensions.
    // SafeImage handles unauthorized external domains gracefully.
    return (
        <a
            href={url}
            data-fancybox="article-gallery"
            aria-label={`View image: ${alt || 'Gallery image'}`}
            style={{display: 'inline-block', width: '100%'}}
        >
            <SafeImage
                src={url}
                alt={alt}
                width={1200}
                height={675}
                sizes="100vw"
                style={{height: 'auto', width: '100%'}}
            />
        </a>
    );
}

