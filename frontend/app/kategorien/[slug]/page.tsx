'use cache';

import {type Metadata} from 'next';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {notFound} from 'next/navigation';
import {fetchCategoryBySlug} from '@/src/lib/strapiContent';
import {absoluteRoute} from '@/src/lib/routes';
import {formatOpenGraphImage} from '@/src/lib/metadata/formatters';
import {normalizeStrapiMedia} from '@/src/lib/rss/media';

type PageProps = {
    params: Promise<{slug: string}>;
};

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    'use cache';
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return {};

    const category = await fetchCategoryBySlug(slug);
    if (!category) return {};

    const title = category.base?.title || category.slug || 'Kategorie';
    const description = category.base?.description || undefined;
    const coverMedia = category.base?.cover
        ? normalizeStrapiMedia(category.base.cover)
        : undefined;
    const coverImage = coverMedia
        ? formatOpenGraphImage(coverMedia)
        : [
              {
                  url: absoluteRoute('/images/m10z.jpg'),
                  alt: 'Mindestens 10 Zeichen',
              },
          ];

    return {
        title,
        description,
        alternates: {
            canonical: absoluteRoute(`/kategorien/${slug}`),
        },
        openGraph: {
            type: 'website',
            title,
            description,
            images: coverImage,
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: coverImage,
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

/**
 * Renders the category detail page for a validated route slug.
 *
 * Validates the incoming `slug` route parameter and returns a 404 page when the slug is invalid; otherwise renders the category detail JSX.
 *
 * @param params - An object providing route parameters (must include `slug`)
 * @returns The page's JSX content when `slug` is valid; invokes a 404 response when `slug` is invalid
 */
export default async function CategoryDetailPage({params}: PageProps) {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return notFound();

    return (
        <main>
            <h1>Kategorie Detail Page</h1>
        </main>
    );
}