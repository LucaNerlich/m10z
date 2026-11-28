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
        // A throttled editor must not be told the draft does not exist. The
        // digest carries the wait to error.tsx (server errors are otherwise
        // replaced with a generic message in production).
        const error = new Error('Too many preview requests');
        (error as Error & {digest?: string}).digest = `PREVIEW_RATE_LIMITED:${rl.retryAfterSeconds}`;
        throw error;
    }

    const {token, status} = await searchParams;
    const secret = process.env.STRAPI_PREVIEW_SECRET;
    const previewStatus: PreviewStatus = status === 'published' ? 'published' : 'draft';
    const uid = previewTypeToUid(rawType);

    // Without the shared secret no link can ever verify. Fail as a configuration
    // error instead of a 404, so a missing env var does not masquerade as a
    // missing document.
    if (!secret) {
        console.error('STRAPI_PREVIEW_SECRET is not set; preview links cannot be verified.');
        throw new Error('STRAPI_PREVIEW_SECRET is required for preview links');
    }

    const tokenResult = classifyPreviewToken(secret, uid, slug, previewStatus, token ?? null);
    if (tokenResult !== 'valid') {
        // A legacy token (HMAC over uid:slug, without the status) means the CMS
        // still runs a release older than backend v2.0.2. It is not accepted
        // (that would reopen the published-link-to-draft escalation this token
        // binding closed), but the 404 is then a deployment skew, not a broken link.
        if (tokenResult === 'legacy') {
            console.error(
                'Preview link is signed with the legacy (status-less) token: the Strapi backend ' +
                'is running an older release. Rebuild and restart it so config/admin.ts signs ' +
                'uid:slug:status (backend v2.0.2+).',
            );
        }
        notFound();
    }

    return {type: rawType, slug, status: previewStatus};
}

export type PreviewTokenResult = 'valid' | 'legacy' | 'invalid';

/**
 * Classify a preview token. `legacy` is not accepted anywhere; it only exists so
 * a stale Strapi release (still signing `uid:slug`) produces a diagnosable log
 * line instead of a silent 404.
 */
export function classifyPreviewToken(
    secret: string,
    uid: string,
    slug: string,
    status: PreviewStatus,
    token: string | null,
): PreviewTokenResult {
    if (verifySecret(token, previewToken(secret, uid, slug, status))) return 'valid';
    if (verifySecret(token, legacyPreviewToken(secret, uid, slug))) return 'legacy';
    return 'invalid';
}

/**
 * HMAC binding a preview link to one document version. Must match the admin
 * preview handler in `backend/config/admin.ts`.
 */
export function previewToken(secret: string, uid: string, slug: string, status: PreviewStatus): string {
    return crypto.createHmac('sha256', secret).update(`${uid}:${slug}:${status}`).digest('hex');
}

/** Token format used before the status binding; only used to recognise a stale backend. */
function legacyPreviewToken(secret: string, uid: string, slug: string): string {
    return crypto.createHmac('sha256', secret).update(`${uid}:${slug}`).digest('hex');
}

// Only a genuine 404 means "this document does not exist". Everything else —
// timeouts, socket errors, 5xx — means the CMS could not answer, so rethrow and
// let the preview segment's error boundary render instead of a misleading 404.
export function handlePreviewFetchError(error: unknown, slug: string, label: string): null {
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
