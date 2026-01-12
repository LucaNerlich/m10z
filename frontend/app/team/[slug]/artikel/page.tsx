import {type Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';

import {AuthorHeader} from '@/src/components/AuthorHeader';
import {AuthorNav} from '@/src/components/AuthorNav';
import {ArticleCard} from '@/src/components/ArticleCard';
import {ContentGrid} from '@/src/components/ContentGrid';
import {EmptyState} from '@/src/components/EmptyState';
import {Pagination} from '@/src/components/Pagination';
import {Section} from '@/src/components/Section';
import {Tag} from '@/src/components/Tag';
import {OG_LOCALE, OG_SITE_NAME} from '@/src/lib/metadata/constants';
import {formatOpenGraphImage} from '@/src/lib/metadata/formatters';
import {absoluteRoute} from '@/src/lib/routes';
import {getOptimalMediaFormat} from '@/src/lib/rss/media';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {fetchArticlesByAuthorPaginated, fetchAuthorBySlug} from '@/src/lib/strapiContent';
import {parseCategoryParam, parsePageParam} from '@/src/lib/params';

type PageProps = {
    params: Promise<{slug: string}>;
    searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({params, searchParams}: PageProps): Promise<Metadata> {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return {};

    const sp = await Promise.resolve(searchParams ?? {});
    const categorySlug = parseCategoryParam(sp);

    const author = await fetchAuthorBySlug(slug);
    if (!author) return {};

    const titleBase = author.title || 'Autor';
    const title = categorySlug ? `${titleBase} – Artikel (${categorySlug})` : `${titleBase} – Artikel`;
    const description = author.description || undefined;
    const avatarMedia = getOptimalMediaFormat(author.avatar, 'medium');
    const avatarImage = avatarMedia ? formatOpenGraphImage(avatarMedia) : undefined;

    return {
        title,
        description,
        alternates: {
            canonical: absoluteRoute(`/team/${slug}/artikel`),
        },
        openGraph: {
            type: 'profile',
            locale: OG_LOCALE,
            siteName: OG_SITE_NAME,
            url: absoluteRoute(`/team/${slug}/artikel`),
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

export default async function AuthorArticlesPage({params, searchParams}: PageProps) {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return notFound();

    const sp = await Promise.resolve(searchParams ?? {});
    const page = parsePageParam(sp);
    const categorySlug = parseCategoryParam(sp);

    const author = await fetchAuthorBySlug(slug);
    if (!author) return notFound();

    const pageSize = 12;
    const data = await fetchArticlesByAuthorPaginated(slug, page, pageSize, categorySlug ?? undefined);

    const {page: currentPage, pageCount, total} = data.pagination;
    const isOutOfRange = total > 0 && page > pageCount;

    const prevPage = currentPage > 1 ? currentPage - 1 : null;
    const nextPage = currentPage < pageCount ? currentPage + 1 : null;

    const buildHref = (p: number) => {
        const qs = new URLSearchParams();
        qs.set('page', String(p));
        if (categorySlug) qs.set('category', categorySlug);
        return `/team/${slug}/artikel?${qs.toString()}`;
    };

    return (
        <main data-list-page>
            <AuthorHeader author={author} />
            <AuthorNav authorSlug={slug} activeSection="artikel" />

            <Section title="Artikel">
                {categorySlug ? (
                    <div style={{display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14}}>
                        <Link href={`/kategorien/${encodeURIComponent(categorySlug)}`} aria-label={`Kategorie anzeigen: ${categorySlug}`}>
                            <Tag>{categorySlug}</Tag>
                        </Link>
                        <Link href={`/team/${slug}/artikel`}>Filter entfernen</Link>
                    </div>
                ) : null}
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
                                    ? 'Keine Artikel in dieser Kategorie von diesem Autor gefunden.'
                                    : 'Keine Artikel von dieser*m Autor*in gefunden.'
                            }
                        />
                        {categorySlug ? (
                            <p>
                                <Link href={`/team/${slug}/artikel`}>Alle Artikel anzeigen</Link>
                            </p>
                        ) : null}
                    </div>
                ) : (
                    <>
                        <ContentGrid gap="comfortable">
                            {data.items.map((article) => (
                                <ArticleCard key={article.slug} article={article} showAuthors={false} showCategories={true} />
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


