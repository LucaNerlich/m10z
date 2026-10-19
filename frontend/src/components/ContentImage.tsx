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
    // `next/image` throws when `placeholder='blur'` has no `blurDataURL`. A
    // string `src` only gets one from `blurhash`; a static import already ships
    // a build-generated one.
    const hasStaticBlur = typeof src === 'object' && !!src.blurDataURL;
    const imagePlaceholder = placeholder === 'blur' && !blurhash && !hasStaticBlur ? 'empty' : placeholder;
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

