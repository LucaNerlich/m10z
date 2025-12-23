'use cache';

import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {notFound} from 'next/navigation';

type PageProps = {
    params: Promise<{slug: string}>;
};

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