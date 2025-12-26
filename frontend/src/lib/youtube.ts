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
    if (!url) return null;

    const match = url.match(YOUTUBE_URL_REGEX);
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

