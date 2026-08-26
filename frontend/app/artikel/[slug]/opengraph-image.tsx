import {buildContentOgImageResponse, OG_IMAGE_SIZE} from '@/src/lib/og/contentOgImage';

import {fetchArticleBySlug} from '@/src/lib/strapiContent';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {type SlugPageParams} from '@/src/lib/params';

export const alt = 'Artikel-Vorschaubild';
export const size = OG_IMAGE_SIZE;
export const contentType = 'image/png';

/**
 * Generate a branded Open Graph image for an article page.
 *
 * Displays the article title on a gradient background with M10Z branding.
 * Falls back to a generic branded card if the article cannot be fetched.
 */
export default async function Image({params}: SlugPageParams) {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);

    let title = 'Mindestens 10 Zeichen';
    let description: string | undefined;

    if (slug) {
        try {
            const article = await fetchArticleBySlug(slug);
            if (article) {
                title = article.title;
                description = article.description ?? undefined;
            }
        } catch {
            // Keep the default title
        }
    }

    return buildContentOgImageResponse({label: 'Artikel', title, description});
}
