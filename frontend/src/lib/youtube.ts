/**
 * YouTube URL patterns and utilities
 */

/**
 * Regex pattern to match YouTube URLs in various formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube-nocookie.com/embed/VIDEO_ID
 * - https://youtube.com/live/VIDEO_ID
 */
export const YOUTUBE_URL_REGEX =
    /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})(?:[?&#].*)?/i;

/**
 * Regex pattern that only matches the specific YouTube watch URL format:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 *
 * This is more restrictive than YOUTUBE_URL_REGEX and only matches the standard watch page URLs.
 */
export const YOUTUBE_WATCH_URL_REGEX =
    /^https?:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:[?&#].*)?$/i;

/**
 * Checks if a string is a YouTube URL
 *
 * @param url - The URL string to check
 * @returns true if the string matches a YouTube URL pattern
 */
export function isYouTubeUrl(url: string | null | undefined): boolean {
    if (!url || typeof url !== 'string') return false;
    return YOUTUBE_URL_REGEX.test(url);
}

/**
 * Checks if a string is a YouTube watch URL (https://www.youtube.com/watch?v=VIDEO_ID)
 *
 * @param url - The URL string to check
 * @returns true if the string matches the specific watch URL format
 */
export function isYouTubeWatchUrl(url: string | null | undefined): boolean {
    if (!url || typeof url !== 'string') return false;
    return YOUTUBE_WATCH_URL_REGEX.test(url);
}

/**
 * Extracts the video ID from a YouTube URL
 *
 * @param url - The YouTube URL
 * @returns The video ID if found, or null
 *
 * @example
 * extractYouTubeVideoId('https://www.youtube.com/watch?v=rCJlSgbiCQA')
 * // Returns: 'rCJlSgbiCQA'
 *
 * @example
 * extractYouTubeVideoId('https://youtu.be/rCJlSgbiCQA')
 * // Returns: 'rCJlSgbiCQA'
 */
export function extractYouTubeVideoId(url: string | null | undefined): string | null {
    if (!url || typeof url !== 'string') return null;
    
    const match = url.match(YOUTUBE_URL_REGEX);
    return match?.[1] ?? null;
}

/**
 * Extracts the video ID from a YouTube watch URL (https://www.youtube.com/watch?v=VIDEO_ID)
 *
 * @param url - The YouTube watch URL
 * @returns The video ID if found, or null
 *
 * @example
 * extractYouTubeWatchVideoId('https://www.youtube.com/watch?v=rCJlSgbiCQA')
 * // Returns: 'rCJlSgbiCQA'
 */
export function extractYouTubeWatchVideoId(url: string | null | undefined): string | null {
    if (!url || typeof url !== 'string') return null;
    
    const match = url.match(YOUTUBE_WATCH_URL_REGEX);
    return match?.[1] ?? null;
}

/**
 * Converts a YouTube URL to an embed URL
 *
 * @param url - The YouTube URL (any format)
 * @param useNoCookie - Whether to use youtube-nocookie.com (privacy mode), defaults to false
 * @returns The embed URL, or null if the URL is invalid
 *
 * @example
 * toYouTubeEmbedUrl('https://www.youtube.com/watch?v=rCJlSgbiCQA')
 * // Returns: 'https://www.youtube.com/embed/rCJlSgbiCQA'
 */
export function toYouTubeEmbedUrl(url: string | null | undefined, useNoCookie = false): string | null {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return null;
    
    const domain = useNoCookie ? 'www.youtube-nocookie.com' : 'www.youtube.com';
    return `https://${domain}/embed/${videoId}`;
}

