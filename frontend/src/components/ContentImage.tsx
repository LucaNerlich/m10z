import Image, {type StaticImageData} from 'next/image';
import styles from './ContentImage.module.css';

type CoverImageProps = {
    src: string | StaticImageData;
    alt: string;
    width: number;
    height: number;
    className?: string;
    placeholder?: 'blur' | 'empty';
    blurhash?: string | null; // Base64 data URL from backend (e.g., "data:image/png;base64,...")
};

/**
 * Reusable cover image component for articles and podcasts.
 * Displays an optimized cover image with consistent styling.
 * Supports base64 blur placeholder for better loading experience.
 *
 * @param src - Image URL
 * @param alt - Alt text for accessibility
 * @param width - Image width
 * @param height - Image height
 * @param className - Optional additional CSS class
 * @param placeholder - Placeholder type ('blur' or 'empty'), defaults to 'empty'
 * @param blurhash - Optional base64 data URL to use as blur placeholder (from backend)
 * @returns A cover image container with the image
 */
export function ContentImage({
    src,
    alt,
    width,
    height,
    className,
    placeholder = 'empty',
    blurhash,
}: CoverImageProps) {
    // Use blurhash directly as blurDataURL if provided and placeholder is 'blur'
    const imagePlaceholder = blurhash && placeholder === 'blur' ? 'blur' : placeholder;
    const blurDataUrlProp = blurhash && placeholder === 'blur' ? {blurDataURL: blurhash} : {};

    return (
        <div className={`${styles.container} ${className || ''}`}>
            <Image
                src={src}
                alt={alt}
                width={width}
                height={height}
                placeholder={imagePlaceholder}
                {...blurDataUrlProp}
                className={styles.image}
            />
        </div>
    );
}

