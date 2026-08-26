import {buildContentOgImageResponse, OG_IMAGE_SIZE} from '@/src/lib/og/contentOgImage';

import {fetchPodcastBySlug} from '@/src/lib/strapiContent';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';

export const alt = 'Podcast-Vorschaubild';
export const size = OG_IMAGE_SIZE;
export const contentType = 'image/png';

/**
 * Generate a branded Open Graph image for a podcast episode page.
 *
 * Displays the episode title on a gradient background with M10Z branding.
 * Falls back to a generic branded card if the episode cannot be fetched.
 */
export default async function Image({params}: {params: Promise<{slug: string}>}) {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);

    let title = 'Mindestens 10 Zeichen';
    let description: string | undefined;

    if (slug) {
        try {
            const episode = await fetchPodcastBySlug(slug);
            if (episode) {
                title = episode.title;
                description = episode.description ?? undefined;
            }
        } catch {
            // Keep the default title
        }
    }

    return buildContentOgImageResponse({label: 'Podcast', title, description});
}
