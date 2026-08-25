import {mediaUrlToAbsolute, type StrapiMedia} from '@/src/lib/strapi/media';
import {ContentImage} from './ContentImage';
import placeholderCover from '@/public/images/m10z.jpg';

const FALLBACK_WIDTH = 400;
const FALLBACK_HEIGHT = 225;

type ContentHeroImageProps = {
    /** Optimized hero media; falls back to the static placeholder when missing. */
    media: StrapiMedia | undefined;
    /** Alt text used when the media has no alternativeText. */
    fallbackAlt: string;
};

/**
 * Full-width hero image for detail pages with blurhash placeholder support.
 * Centralizes the fallback dimensions and alt/title resolution shared by the
 * article and podcast detail views.
 */
export function ContentHeroImage({media, fallbackAlt}: ContentHeroImageProps) {
    const imageUrl = media ? mediaUrlToAbsolute({media}) : undefined;
    const blurhash = media?.blurhash ?? null;

    return (
        <ContentImage
            src={imageUrl ?? placeholderCover}
            alt={media?.alternativeText ?? fallbackAlt}
            title={media?.caption ?? undefined}
            width={media?.width ?? FALLBACK_WIDTH}
            height={media?.height ?? FALLBACK_HEIGHT}
            placeholder={blurhash ? 'blur' : 'empty'}
            blurhash={blurhash}
            priority={true}
        />
    );
}
