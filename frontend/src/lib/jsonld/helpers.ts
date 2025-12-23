import {type ImageObject} from './types';

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
 * Produce an ISO-8601 duration string representing the given total seconds in `PT#M#S` form.
 *
 * @param seconds - Total duration in seconds
 * @returns An ISO-8601 duration string formatted as `PT{minutes}M{seconds}S`
 */
export function formatIso8601Duration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `PT${minutes}M${remainingSeconds}S`;
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
