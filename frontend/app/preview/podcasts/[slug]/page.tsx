import {type Metadata} from 'next';
import {notFound} from 'next/navigation';

import {fetchPodcastBySlugForPreview} from '@/src/lib/strapiContent';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {verifySecret} from '@/src/lib/security/verifySecret';
import {PodcastDetail} from '@/src/components/PodcastDetail';
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

export default async function PodcastPreviewPage({params, searchParams}: PageProps) {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) notFound();

    const {secret, status} = await searchParams;
    const expected = process.env.STRAPI_PREVIEW_SECRET ?? null;
    if (!verifySecret(secret ?? null, expected)) {
        notFound();
    }

    const previewStatus = status === 'published' ? 'published' : 'draft';

    const podcast = await fetchPodcastBySlugForPreview(slug, previewStatus).catch((error: unknown) => {
        const errorMessage = getErrorMessage(error);
        if (isTimeoutOrSocketError(error)) {
            console.error(`Socket/timeout error fetching preview podcast for slug "${slug}":`, errorMessage);
            throw error instanceof Error ? error : new Error('Service unavailable');
        }
        if (!errorMessage.includes('404') && !errorMessage.includes('not found')) {
            console.error(`Error fetching preview podcast for slug "${slug}":`, errorMessage);
        }
        return null;
    });

    if (!podcast) notFound();

    return (
        <>
            <PreviewBanner status={previewStatus} />
            <PodcastDetail slug={slug} podcast={podcast} />
        </>
    );
}
