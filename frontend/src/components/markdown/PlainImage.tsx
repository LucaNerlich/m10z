'use client';

import React from 'react';
import {toAbsoluteUrl} from '@/src/lib/strapi';
import {SafeImage} from '@/src/components/SafeImage';

export type PlainImageProps = React.ComponentProps<'img'>;

/**
 * Render a simple, non-interactive image for markdown content.
 *
 * This component intentionally does not include any Fancybox attributes or
 * gallery behavior. It is used for external or unauthorized image domains.
 */
export function PlainImage({src, alt = ''}: PlainImageProps) {
    if (!src || typeof src !== 'string') return null;

    const url = /^https?:\/\//i.test(src) ? src : toAbsoluteUrl(src);

    return (
        <SafeImage
            src={url}
            alt={alt}
            width={1200}
            height={675}
            sizes="100vw"
            style={{height: 'auto', width: '100%'}}
        />
    );
}

