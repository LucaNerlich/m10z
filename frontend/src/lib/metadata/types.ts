/**
 * Type definitions for metadata generation utilities.
 */

/**
 * Metadata structure for author/team member pages.
 */
export interface AuthorMetadata {
    name: string;
    description?: string | null;
    avatarImageUrl?: string;
}

/**
 * Metadata structure for content pages (articles, podcasts, categories).
 */
export interface ContentMetadata {
    title: string;
    description?: string | null;
    coverImageUrl?: string;
    publishedDate?: string | null;
}

