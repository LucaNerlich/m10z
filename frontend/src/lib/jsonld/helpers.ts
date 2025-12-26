import {type ImageObject, type Person} from './types';
import {absoluteRoute, routes} from '@/src/lib/routes';
import {mediaUrlToAbsolute, normalizeStrapiMedia, type StrapiAuthor, type StrapiMedia} from '@/src/lib/rss/media';
import serialize from 'serialize-javascript';

/**
 * Produce an ISO-8601 timestamp string for the given date input.
 *
 * @param date - A date string to convert; may be `null` or `undefined`
 * @returns The ISO-8601 representation of `date`, or `undefined` if `date` is `null`, `undefined`, empty, or not a valid date
 */
export function formatIso8601Date(date: string | null | undefined): string | undefined {
    if (!date) return undefined;
    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) return undefined;
    return dateObj.toISOString();
}

/**
 * Produce an ISO-8601 duration string representing the given total seconds in `PT#H#M#S` form.
 *
 * @param seconds - Total duration in seconds (will be rounded down to nearest integer; negative values are treated as 0)
 * @returns An ISO-8601 duration string formatted as `PT{hours}H{minutes}M{seconds}S` (omits hours/minutes/seconds components if zero)
 */
export function formatIso8601Duration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return 'PT0S';
    }
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;

    const parts: string[] = ['PT'];
    if (hours > 0) parts.push(`${hours}H`);
    if (minutes > 0) parts.push(`${minutes}M`);
    if (remainingSeconds > 0 || parts.length === 1) parts.push(`${remainingSeconds}S`);
    return parts.join('');
}

/**
 * Create an ImageObject schema for the given image URL and optional dimensions.
 *
 * @param url - The image URL
 * @param width - Width in pixels; included only if a positive number
 * @param height - Height in pixels; included only if a positive number
 * @returns The constructed ImageObject containing `@context`, `@type`, `url`, and optional `width`/`height`
 */
export function buildImageObject(url: string, width?: number, height?: number): ImageObject {
    const image: ImageObject = {
        '@context': 'https://schema.org',
        '@type': 'ImageObject',
        url,
    };
    if (typeof width === 'number' && width > 0) {
        image.width = width;
    }
    if (typeof height === 'number' && height > 0) {
        image.height = height;
    }
    return image;
}

/**
 * Create a schema.org Person object from a Strapi author record.
 *
 * The returned Person includes a name (falls back to "Unknown Author"), a URL when the author has a slug,
 * and an image when the author has an avatar. If the avatar contains width and height, the image is an ImageObject;
 * otherwise the image is the avatar's absolute URL.
 *
 * @param author - The Strapi author record to convert
 * @returns A Person object suitable for JSON-LD embedding
 */
export function authorToPerson(author: StrapiAuthor): Person {
    const name = author.title ?? 'Unknown Author';
    const person: Person = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name,
    };

    if (author.slug) {
        person.url = absoluteRoute(routes.author(author.slug));
    }

    if (author.avatar) {
        const avatarMedia = normalizeStrapiMedia(author.avatar);
        const avatarUrl = mediaUrlToAbsolute({media: avatarMedia});
        if (avatarUrl) {
            if (avatarMedia.width && avatarMedia.height) {
                person.image = buildImageObject(avatarUrl, avatarMedia.width, avatarMedia.height);
            } else {
                person.image = avatarUrl;
            }
        }
    }

    return person;
}

/**
 * Convert a Strapi media entry into an ImageObject or an absolute image URL.
 *
 * @param media - The Strapi media record to convert
 * @returns An ImageObject when `width` and `height` are present, the absolute image URL string when only a URL is available, or `undefined` if no usable URL exists
 */
export function mediaToImage(media: StrapiMedia | undefined): ImageObject | string | undefined {
    if (!media?.url) return undefined;
    const url = mediaUrlToAbsolute({media});
    if (!url) return undefined;

    if (media.width && media.height) {
        return buildImageObject(url, media.width, media.height);
    }
    return url;
}

/**
 * Extracts the URL from an image representation (ImageObject or string).
 *
 * @param image - An ImageObject, a URL string, or undefined
 * @returns The URL string if available, otherwise undefined
 */
function extractImageUrl(image: ImageObject | string | undefined): string | undefined {
    if (!image) return undefined;
    if (typeof image === 'string') return image;
    return image.url;
}

/**
 * Compares two image representations by their URL, regardless of their type (ImageObject or string).
 *
 * @param image1 - First image (ImageObject, string, or undefined)
 * @param image2 - Second image (ImageObject, string, or undefined)
 * @returns `true` if both images have the same URL, `false` otherwise
 */
export function imagesEqual(image1: ImageObject | string | undefined, image2: ImageObject | string | undefined): boolean {
    const url1 = extractImageUrl(image1);
    const url2 = extractImageUrl(image2);
    if (!url1 || !url2) return false;
    return url1 === url2;
}

/**
 * Stringifies a JSON-LD object in a stable, deterministic way to prevent hydration mismatches.
 * Uses serialize-javascript for safe serialization as recommended by Next.js docs.
 * Ensures consistent ordering, removes undefined values, and sanitizes the output.
 *
 * @param jsonLd - The JSON-LD object to stringify
 * @returns A stable, sanitized JSON string representation safe for use in script tags
 */
export function stringifyJsonLd(jsonLd: unknown): string {
    // Remove undefined values and ensure stable ordering
    const cleaned = JSON.parse(JSON.stringify(jsonLd, (key, value) => {
        // Remove undefined values
        if (value === undefined) return undefined;
        return value;
    }));
    // Use serialize-javascript for safe serialization (handles XSS protection)
    // For JSON-LD, we want JSON format, so we use serialize with isJSON: true
    // This produces JSON-compatible output while maintaining security
    return serialize(cleaned, { isJSON: true });
}
