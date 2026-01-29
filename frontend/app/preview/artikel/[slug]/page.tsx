import {type Metadata} from 'next';
import {notFound} from 'next/navigation';

import {fetchArticleBySlugForPreview} from '@/src/lib/strapiContent';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {verifySecret} from '@/src/lib/security/verifySecret';
import {ArticleDetail} from '@/src/components/ArticleDetail';
import PreviewBanner from '@/src/components/PreviewBanner';
import {getErrorMessage, isTimeoutOrSocketError} from '@/src/lib/errors';

export const dynamic = 'force-dynamic';

type PageProps = {
    params: Promise<{slug: string}>;
    searchParams: Promise<{secret?: string; status?: string}>;
};

export async function generateMetadata(): Promise<Metadata> {
    return {
        robots: {
            index: false,
            follow: false,
        },
    };
}

export default async function ArticlePreviewPage({params, searchParams}: PageProps) {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return notFound();

    const {secret, status} = await searchParams;
    const expected = process.env.STRAPI_PREVIEW_SECRET ?? null;
    if (!verifySecret(secret ?? null, expected)) {
        return notFound();
    }

    try {
        const previewStatus = status === 'published' ? 'published' : 'draft';
        const article = await fetchArticleBySlugForPreview(slug, previewStatus);
        if (!article) return notFound();

        return (
            <>
                <PreviewBanner status={previewStatus} />
                <ArticleDetail slug={slug} article={article} />
            </>
        );
    } catch (error) {
        const errorMessage = getErrorMessage(error);

        if (isTimeoutOrSocketError(error)) {
            console.error(`Socket/timeout error fetching preview article for slug "${slug}":`, errorMessage);
            return notFound();
        }

        if (errorMessage.includes('404') || errorMessage.includes('not found')) {
            return notFound();
        }

        console.error(`Error fetching preview article for slug "${slug}":`, errorMessage);
        return notFound();
    }
}
