import {type ImageObject} from './types';

/**
 * Converts a date string to ISO-8601 format.
 * Returns undefined if the date is invalid or null.
 */
export function formatIso8601Date(date: string | null | undefined): string | undefined {
    if (!date) return undefined;
    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) return undefined;
    return dateObj.toISOString();
}

/**
 * Converts seconds to ISO-8601 duration format (PT#M#S).
 * Example: 3661 seconds → "PT61M1S"
 */
export function formatIso8601Duration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `PT${minutes}M${remainingSeconds}S`;
}

/**
 * Constructs an ImageObject schema from URL and optional dimensions.
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

