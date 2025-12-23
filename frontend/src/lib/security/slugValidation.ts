/**
 * Validates and sanitizes slug parameters from URL paths.
 *
 * Slugs should only contain alphanumeric characters, hyphens, and underscores.
 * This prevents injection attacks and ensures safe usage in queries and cache tags.
 *
 * @param slug - The raw slug value from URL parameters
 * @returns The sanitized slug if valid, or null if invalid
 * @throws Error if slug is empty or contains invalid characters
 */
export function validateSlug(slug: string | null | undefined): string {
    if (!slug) {
        throw new Error('Slug is required');
    }

    // Trim whitespace
    const trimmed = slug.trim();

    // Check length (reasonable limit to prevent DoS)
    if (trimmed.length === 0) {
        throw new Error('Slug cannot be empty');
    }

    if (trimmed.length > 255) {
        throw new Error('Slug exceeds maximum length of 255 characters');
    }

    // Validate pattern: only alphanumeric, hyphens, and underscores
    // This prevents injection attacks in query strings and cache tags
    const slugPattern = /^[a-zA-Z0-9_-]+$/;
    if (!slugPattern.test(trimmed)) {
        throw new Error('Slug contains invalid characters. Only alphanumeric characters, hyphens, and underscores are allowed');
    }

    return trimmed;
}

/**
 * Safely validates a slug and returns null if invalid instead of throwing.
 * Useful when you want to handle invalid slugs gracefully (e.g., return 404).
 *
 * @param slug - The raw slug value from URL parameters
 * @returns The sanitized slug if valid, or null if invalid
 */
export function validateSlugSafe(slug: string | null | undefined): string | null {
    try {
        return validateSlug(slug);
    } catch {
        return null;
    }
}

