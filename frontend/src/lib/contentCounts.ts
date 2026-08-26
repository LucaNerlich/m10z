/**
 * German content-count labels shared by the author and category cards.
 */

/**
 * Format article/podcast counts into a German label, e.g.
 * "3 Artikel, 2 Podcasts". Returns "Keine Inhalte" when there is nothing to count.
 */
export function formatContentCounts(articleCount?: number, podcastCount?: number): string {
    const parts: string[] = [];
    if (articleCount !== undefined && articleCount > 0) {
        parts.push(`${articleCount} Artikel`);
    }
    if (podcastCount !== undefined && podcastCount > 0) {
        parts.push(`${podcastCount} ${podcastCount === 1 ? 'Podcast' : 'Podcasts'}`);
    }
    return parts.join(', ') || 'Keine Inhalte';
}
