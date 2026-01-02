import React from 'react';
import {toAbsoluteUrl} from '@/src/lib/strapi';
import {SafeImage} from '@/src/components/SafeImage';
import {umamiEventId} from '@/src/lib/analytics/umami';

export type ImageProps = React.ComponentProps<'img'>;

/**
 * Render an image suitable for markdown with Fancybox gallery support.
 *
 * @param src - Image source URL or path; if missing or not a string, the component returns `null`
 * @param alt - Alternate text for the image and for the link's aria-label (defaults to an empty string)
 * @returns The anchor-wrapped image element configured for gallery viewing, or `null` when `src` is invalid
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
            data-umami-event={umamiEventId(['article', 'image', 'open'])}
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
