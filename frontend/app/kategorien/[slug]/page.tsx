'use cache';

import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {notFound} from 'next/navigation';

type PageProps = {
    params: Promise<{slug: string}>;
};

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
