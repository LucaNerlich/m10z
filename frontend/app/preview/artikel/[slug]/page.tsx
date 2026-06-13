import {type Metadata} from 'next';
import {notFound} from 'next/navigation';
import {headers} from 'next/headers';

import {fetchArticleBySlugForPreview} from '@/src/lib/strapiContent';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {verifySecret} from '@/src/lib/security/verifySecret';
import {checkRateLimit} from '@/src/lib/security/rateLimit';
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
    if (!slug) notFound();

    const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rl = checkRateLimit(`preview:${ip}`, {windowMs: 60_000, max: 20});
    if (!rl.ok) notFound();

    const {secret, status} = await searchParams;
    const expected = process.env.STRAPI_PREVIEW_SECRET ?? null;
    if (!verifySecret(secret ?? null, expected)) {
        notFound();
    }

    const previewStatus = status === 'published' ? 'published' : 'draft';

    const article = await fetchArticleBySlugForPreview(slug, previewStatus).catch((error: unknown) => {
        const errorMessage = getErrorMessage(error);
        if (isTimeoutOrSocketError(error)) {
            console.error(`Socket/timeout error fetching preview article for slug "${slug}":`, errorMessage);
        } else if (!errorMessage.includes('404') && !errorMessage.includes('not found')) {
            console.error(`Error fetching preview article for slug "${slug}":`, errorMessage);
        }
        return null;
    });

    if (!article) notFound();

    return (
        <>
            <PreviewBanner status={previewStatus} />
            <ArticleDetail slug={slug} article={article} />
        </>
    );
}
