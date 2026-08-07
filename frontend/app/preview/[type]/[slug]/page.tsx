import {type Metadata} from 'next';
import {notFound} from 'next/navigation';
import {headers} from 'next/headers';

import {fetchArticleBySlugForPreview, fetchPodcastBySlugForPreview} from '@/src/lib/strapiContent';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {verifySecret} from '@/src/lib/security/verifySecret';
import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {ArticleDetail} from '@/src/components/ArticleDetail';
import {PodcastDetail} from '@/src/components/PodcastDetail';
import PreviewBanner from '@/src/components/PreviewBanner';
import {getErrorMessage, isTimeoutOrSocketError} from '@/src/lib/errors';

export const dynamic = 'force-dynamic';

type PreviewType = 'artikel' | 'podcasts';
type PreviewStatus = 'draft' | 'published';

function isPreviewType(value: string): value is PreviewType {
    return value === 'artikel' || value === 'podcasts';
}

type PageProps = {
    params: Promise<{type: string; slug: string}>;
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

async function resolvePreviewContext(
    params: PageProps['params'],
    searchParams: PageProps['searchParams'],
): Promise<{type: PreviewType; slug: string; status: PreviewStatus}> {
    const {type: rawType, slug: rawSlug} = await params;
    if (!isPreviewType(rawType)) notFound();

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

    return {type: rawType, slug, status: status === 'published' ? 'published' : 'draft'};
}

// Timeout/socket errors indicate Strapi is unreachable, not that the slug doesn't exist —
// rethrow so Next renders the error boundary instead of a misleading "not found".
function handlePreviewFetchError(error: unknown, slug: string, label: string): null {
    const errorMessage = getErrorMessage(error);
    if (isTimeoutOrSocketError(error)) {
        console.error(`Socket/timeout error fetching preview ${label} for slug "${slug}":`, errorMessage);
        throw error instanceof Error ? error : new Error('Service unavailable');
    }
    if (!errorMessage.includes('404') && !errorMessage.includes('not found')) {
        console.error(`Error fetching preview ${label} for slug "${slug}":`, errorMessage);
    }
    return null;
}

export default async function PreviewPage({params, searchParams}: PageProps) {
    const {type, slug, status} = await resolvePreviewContext(params, searchParams);

    if (type === 'artikel') {
        const article = await fetchArticleBySlugForPreview(slug, status).catch((error: unknown) =>
            handlePreviewFetchError(error, slug, 'article'),
        );
        if (!article) notFound();

        return (
            <>
                <PreviewBanner status={status} />
                <ArticleDetail slug={slug} article={article} />
            </>
        );
    }

    const podcast = await fetchPodcastBySlugForPreview(slug, status).catch((error: unknown) =>
        handlePreviewFetchError(error, slug, 'podcast'),
    );
    if (!podcast) notFound();

    return (
        <>
            <PreviewBanner status={status} />
            <PodcastDetail slug={slug} podcast={podcast} />
        </>
    );
}
