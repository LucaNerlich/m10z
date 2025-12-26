import {mediaUrlToAbsolute, type StrapiMedia} from '@/src/lib/rss/media';

type OGImageObject = {
    url: string | URL;
    alt?: string;
    width?: number;
    height?: number;
    type?: string;
    secureUrl?: string | URL;
};

/**
 * Converts a Strapi media object into Next.js Open Graph image metadata.
 *
 * @param media - The Strapi media object to convert; may be undefined
 * @returns An array of Next.js Image metadata objects with url, alt text, and optional dimensions, or undefined if no valid media is provided
 */
export function formatOpenGraphImage(media: StrapiMedia | undefined): OGImageObject[] | undefined {
    if (!media) return undefined;

    const url = mediaUrlToAbsolute({media});
    if (!url) return undefined;

    const image: OGImageObject = {
        url,
        alt: media.alternativeText || media.caption || undefined,
    };

    if (media.width && media.height) {
        image.width = media.width;
        image.height = media.height;
    }

    return [image];
}

