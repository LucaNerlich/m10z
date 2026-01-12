import {type Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';

import {AuthorHeader} from '@/src/components/AuthorHeader';
import {AuthorNav} from '@/src/components/AuthorNav';
import {ContentGrid} from '@/src/components/ContentGrid';
import {EmptyState} from '@/src/components/EmptyState';
import {Pagination} from '@/src/components/Pagination';
import {PodcastCard} from '@/src/components/PodcastCard';
import {Section} from '@/src/components/Section';
import {OG_LOCALE, OG_SITE_NAME} from '@/src/lib/metadata/constants';
import {formatOpenGraphImage} from '@/src/lib/metadata/formatters';
import {absoluteRoute} from '@/src/lib/routes';
import {getOptimalMediaFormat} from '@/src/lib/rss/media';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {fetchAuthorBySlug, fetchPodcastsByAuthorPaginated} from '@/src/lib/strapiContent';

type PageProps = {
    params: Promise<{slug: string}>;
    searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
};

function parsePageParam(searchParams: Record<string, string | string[] | undefined>): number {
    const raw = searchParams.page;
    const rawString = Array.isArray(raw) ? raw[0] : raw;
    const parsed = Number(rawString);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return Math.max(1, Math.floor(parsed));
}

function parseCategoryParam(searchParams: Record<string, string | string[] | undefined>): string | null {
    const raw = searchParams.category;
    const rawString = Array.isArray(raw) ? raw[0] : raw;
    if (!rawString) return null;
    return validateSlugSafe(rawString);
}

export async function generateMetadata({params, searchParams}: PageProps): Promise<Metadata> {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return {};

    const sp = await Promise.resolve(searchParams ?? {});
    const categorySlug = parseCategoryParam(sp);

    const author = await fetchAuthorBySlug(slug);
    if (!author) return {};

    const titleBase = author.title || 'Autor';
    const title = categorySlug ? `${titleBase} – Podcasts (${categorySlug})` : `${titleBase} – Podcasts`;
    const description = author.description || undefined;
    const avatarMedia = getOptimalMediaFormat(author.avatar, 'medium');
    const avatarImage = avatarMedia ? formatOpenGraphImage(avatarMedia) : undefined;

    return {
        title,
        description,
        alternates: {
            canonical: absoluteRoute(`/team/${slug}/podcasts`),
        },
        openGraph: {
            type: 'profile',
            locale: OG_LOCALE,
            siteName: OG_SITE_NAME,
            url: absoluteRoute(`/team/${slug}/podcasts`),
            title,
            description,
            images: avatarImage,
        },
        twitter: {
            card: 'summary',
            title,
            description,
            images: avatarImage,
        },
        ...(categorySlug
            ? {
                  robots: {
                      index: false,
                      follow: true,
                  },
              }
            : {}),
    };
}

export default async function AuthorPodcastsPage({params, searchParams}: PageProps) {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return notFound();

    const sp = await Promise.resolve(searchParams ?? {});
    const page = parsePageParam(sp);
    const categorySlug = parseCategoryParam(sp);

    const author = await fetchAuthorBySlug(slug);
    if (!author) return notFound();

    const pageSize = 12;
    const data = await fetchPodcastsByAuthorPaginated(slug, page, pageSize, categorySlug ?? undefined);

    const {page: currentPage, pageCount, total} = data.pagination;
    const isOutOfRange = total > 0 && page > pageCount;

    const prevPage = currentPage > 1 ? currentPage - 1 : null;
    const nextPage = currentPage < pageCount ? currentPage + 1 : null;

    const buildHref = (p: number) => {
        const qs = new URLSearchParams();
        qs.set('page', String(p));
        if (categorySlug) qs.set('category', categorySlug);
        return `/team/${slug}/podcasts?${qs.toString()}`;
    };

    return (
        <main data-list-page>
            <AuthorHeader author={author} />
            <AuthorNav authorSlug={slug} activeSection="podcasts" />

            <Section title={categorySlug ? `Podcasts (Kategorie: ${categorySlug})` : 'Podcasts'}>
                {isOutOfRange ? (
                    <div>
                        <EmptyState message="Diese Seite existiert nicht." />
                        <p>
                            <Link href={buildHref(1)}>Zur ersten Seite</Link>
                        </p>
                    </div>
                ) : data.items.length === 0 ? (
                    <div>
                        <EmptyState
                            message={
                                categorySlug
                                    ? 'Keine Podcasts in dieser Kategorie von diesem Autor gefunden.'
                                    : 'Keine Podcasts von diesem Autor gefunden.'
                            }
                        />
                        {categorySlug ? (
                            <p>
                                <Link href={`/team/${slug}/podcasts`}>Alle Podcasts anzeigen</Link>
                            </p>
                        ) : null}
                    </div>
                ) : (
                    <>
                        <ContentGrid gap="comfortable">
                            {data.items.map((podcast) => (
                                <PodcastCard key={podcast.slug} podcast={podcast} showAuthors={false} showCategories={true} />
                            ))}
                        </ContentGrid>
                        {pageCount > 1 ? (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={pageCount}
                                previousHref={prevPage ? buildHref(prevPage) : undefined}
                                nextHref={nextPage ? buildHref(nextPage) : undefined}
                            />
                        ) : null}
                    </>
                )}
            </Section>
        </main>
    );
}


