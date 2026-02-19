'use client';

import {useState} from 'react';
import Image from 'next/image';
import {isImageHostnameAllowed} from '@/src/lib/imageUtils';
import {ImageWarning} from './ImageWarning';

type SafeImageProps = {
    src: string;
    alt?: string;
    width?: number;
    height?: number;
    sizes?: string;
    style?: React.CSSProperties;
    title?: string;
};

/**
 * Safe wrapper around Next.js Image component that handles unauthorized external images.
 * If the image hostname is not allowed, displays a warning component instead of crashing.
 * Also handles runtime loading errors gracefully.
 */
export function SafeImage({src, alt = '', width = 1200, height = 675, sizes = '(max-width: 900px) 100vw, 800px', style, title}: SafeImageProps) {
    const [hasError, setHasError] = useState(false);

    // Check if hostname is allowed before rendering
    // This prevents Next.js from throwing configuration errors
    if (!isImageHostnameAllowed(src)) {
        return <ImageWarning src={src} alt={alt} />;
    }

    // If there's a loading error, show warning instead
    if (hasError) {
        return <ImageWarning src={src} alt={alt} />;
    }

    return (
        <Image
            src={src}
            alt={alt}
            title={title}
            width={width}
            height={height}
            sizes={sizes}
            style={style}
            onError={() => setHasError(true)}
        />
    );
}

