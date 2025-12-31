'use client';

import {useState} from 'react';
import {isImageHostnameAllowed} from '@/src/lib/imageUtils';
import {ImageWarning} from './ImageWarning';

type SafeImageProps = {
    src: string;
    alt?: string;
    width?: number;
    height?: number;
    sizes?: string;
    style?: React.CSSProperties;
};

/**
 * Safe wrapper around img element that handles unauthorized external images.
 * If the image hostname is not allowed, displays a warning component instead of crashing.
 * Also handles runtime loading errors gracefully.
 */
export function SafeImage({src, alt = '', width = 1200, height = 675, sizes = '100vw', style}: SafeImageProps) {
    const [hasError, setHasError] = useState(false);

    // Check if hostname is allowed before rendering
    if (!isImageHostnameAllowed(src)) {
        return <ImageWarning src={src} alt={alt} />;
    }

    // If there's a loading error, show warning instead
    if (hasError) {
        return <ImageWarning src={src} alt={alt} />;
    }

    return (
        <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            sizes={sizes}
            style={style}
            onError={() => setHasError(true)}
            loading="lazy"
        />
    );
}

