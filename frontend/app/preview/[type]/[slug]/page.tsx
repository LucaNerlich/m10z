import crypto from 'node:crypto';

import {type Metadata} from 'next';
import {notFound} from 'next/navigation';
import {headers} from 'next/headers';

import {fetchArticleBySlugForPreview, fetchPodcastBySlugForPreview} from '@/src/lib/strapiContent';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {verifySecret} from '@/src/lib/security/verifySecret';
import {createRateLimiter} from '@/src/lib/security/rateLimit';
import {getClientIp} from '@/src/lib/net/getClientIp';
import {ArticleDetail} from '@/src/components/ArticleDetail';
import {PodcastDetail} from '@/src/components/PodcastDetail';
import PreviewBanner from '@/src/components/PreviewBanner';
import {getErrorMessage, isNotFoundError} from '@/src/lib/errors';

export const dynamic = 'force-dynamic';

// Own bucket store, so another endpoint's limiter filling up cannot fail this one closed.
const previewLimiter = createRateLimiter({windowMs: 60_000, max: 20});

type PreviewType = 'artikel' | 'podcasts';
type PreviewStatus = 'draft' | 'published';

function isPreviewType(value: string): value is PreviewType {
    return value === 'artikel' || value === 'podcasts';
}

// Mirrors backend/config/admin.ts's preview.config.handler route-to-uid mapping,
// used to recompute the same per-document HMAC the link was generated with.
function previewTypeToUid(type: PreviewType): string {
    return type === 'artikel' ? 'api::article.article' : 'api::podcast.podcast';
}

type PageProps = {
    params: Promise<{type: string; slug: string}>;
    searchParams: Promise<{token?: string; status?: string}>;
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

    // Trusts the proxy-appended last hop, unlike the client-controlled first one.
    const ip = getClientIp(await headers());
    const rl = previewLimiter.check(`preview:${ip}`);
    if (!rl.ok) {
        // A throttled editor must not be told the draft does not exist.
        throw new Error('Zu viele Vorschau-Anfragen. Bitte in einer Minute erneut versuchen.');
    }

    const {token, status} = await searchParams;
    const secret = process.env.STRAPI_PREVIEW_SECRET;
    const expected = secret
        ? crypto.createHmac('sha256', secret).update(`${previewTypeToUid(rawType)}:${slug}`).digest('hex')
        : null;
    if (!verifySecret(token ?? null, expected)) {
        notFound();
    }

    return {type: rawType, slug, status: status === 'published' ? 'published' : 'draft'};
}

// Only a genuine 404 means "this document does not exist". Everything else —
// timeouts, socket errors, 5xx — means the CMS could not answer, so rethrow and
// let the preview segment's error boundary render instead of a misleading 404.
function handlePreviewFetchError(error: unknown, slug: string, label: string): null {
    if (!isNotFoundError(error)) {
        console.error(
            `Error fetching preview ${label} for slug "${slug}":`,
            getErrorMessage(error),
        );
        throw error instanceof Error ? error : new Error('Service unavailable');
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
