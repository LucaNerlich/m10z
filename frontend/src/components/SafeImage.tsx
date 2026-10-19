'use client';

import {useState} from 'react';
import Image from 'next/image';
import {isImageHostnameAllowed} from '@/src/lib/image';
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
export function SafeImage({
                              src,
                              alt = '',
                              width = 1200,
                              height = 675,
                              sizes = '(max-width: 900px) 100vw, 800px',
                              style,
                              title,
                          }: SafeImageProps) {
    // Track *which* src failed rather than a bare boolean: a boolean stays true
    // for the element's lifetime, so a list that revalidates a different image
    // into the same position kept showing the warning for a URL that never
    // failed. Comparing against the current src retries automatically.
    const [failedSrc, setFailedSrc] = useState<string | null>(null);

    if (!isImageHostnameAllowed(src)) {
        return <ImageWarning src={src} alt={alt} reason="unauthorized" />;
    }

    if (failedSrc === src) {
        return <ImageWarning src={src} alt={alt} reason="load-error" />;
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
            onError={() => setFailedSrc(src)}
        />
    );
}

