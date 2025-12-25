import Image from 'next/image';
import styles from './ContentImage.module.css';

type CoverImageProps = {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
};

/**
 * Reusable cover image component for articles and podcasts.
 * Displays an optimized cover image with consistent styling.
 *
 * @param src - Image URL
 * @param alt - Alt text for accessibility
 * @param width - Image width
 * @param height - Image height
 * @param className - Optional additional CSS class
 * @returns A cover image container with the image, or null if required props are missing
 */
export function ContentImage({src, alt, width, height, className}: CoverImageProps) {
    if (!src || !width || !height) {
        return null;
    }

    return (
        <div className={`${styles.container} ${className || ''}`}>
            <Image
                src={src}
                alt={alt}
                width={width}
                height={height}
                priority
                className={styles.image}
            />
        </div>
    );
}

