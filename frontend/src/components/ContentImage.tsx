import styles from './ContentImage.module.css';

type CoverImageProps = {
    src: string | {src: string};
    alt: string;
    width: number;
    height: number;
    className?: string;
    placeholder?: 'blur' | 'empty';
    blurhash?: string | null; // Base64 data URL from backend (e.g., "data:image/png;base64,...")
};

/**
 * Reusable cover image component for articles and podcasts.
 * Displays a cover image with consistent styling.
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
    const srcString = typeof src === 'string' ? src : src.src;
    const style = blurhash && placeholder === 'blur' ? {
        backgroundImage: `url(${blurhash})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    } : {};

    return (
        <div className={`${styles.container} ${className || ''}`}>
            <img
                src={srcString}
                alt={alt}
                width={width}
                height={height}
                className={styles.image}
                style={style}
                loading="lazy"
            />
        </div>
    );
}

