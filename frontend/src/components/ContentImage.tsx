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
    title?: string;
    priority?: boolean;
};

/** Optimized cover image with consistent styling and optional blur placeholder. */
export function ContentImage({
                                 src,
                                 alt,
                                 width,
                                 height,
                                 className,
                                 placeholder = 'empty',
                                 blurhash,
                                 title,
                                 priority = false,
                             }: CoverImageProps) {
    // `next/image` throws when `placeholder='blur'` has no `blurDataURL`, so a
    // caller that opted into blur without a blurhash degrades to `empty`.
    const imagePlaceholder = placeholder === 'blur' && !blurhash ? 'empty' : placeholder;
    const blurDataUrlProp = blurhash && placeholder === 'blur' ? {blurDataURL: blurhash} : {};

    return (
        <div className={`${styles.container} ${className || ''}`}>
            <Image
                src={src}
                alt={alt}
                title={title}
                width={width}
                height={height}
                placeholder={imagePlaceholder}
                {...blurDataUrlProp}
                className={styles.image}
                priority={priority}
                loading={priority ? 'eager' : undefined}
            />
        </div>
    );
}

