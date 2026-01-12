import {type Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {type ReactNode} from 'react';

import {AuthorHeader} from '@/src/components/AuthorHeader';
import {AuthorNav, type AuthorSection} from '@/src/components/AuthorNav';
import {ContentGrid} from '@/src/components/ContentGrid';
import {EmptyState} from '@/src/components/EmptyState';
import {Pagination} from '@/src/components/Pagination';
import {Section} from '@/src/components/Section';
import {Tag} from '@/src/components/Tag';
import {OG_LOCALE, OG_SITE_NAME} from '@/src/lib/metadata/constants';
import {formatOpenGraphImage} from '@/src/lib/metadata/formatters';
import {parseCategoryParam, parsePageParam} from '@/src/lib/params';
import {absoluteRoute} from '@/src/lib/routes';
import {getOptimalMediaFormat} from '@/src/lib/rss/media';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {fetchAuthorBySlug, fetchCategoryBySlug, type PaginatedResult} from '@/src/lib/strapiContent';
import styles from './AuthorContentPage.module.css';

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateAuthorContentMetadata(args: {
    params: Promise<{slug: string}>;
    searchParams?: SearchParams | Promise<SearchParams>;
    sectionLabel: 'Artikel' | 'Podcasts';
    sectionPath: 'artikel' | 'podcasts';
}): Promise<Metadata> {
    const {slug: rawSlug} = await args.params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return {};

    const sp = await Promise.resolve(args.searchParams ?? {});
    const categorySlug = parseCategoryParam(sp);

    const author = await fetchAuthorBySlug(slug);
    if (!author) return {};

    const titleBase = author.title || 'Autor';
    const title = categorySlug ? `${titleBase} – ${args.sectionLabel} (${categorySlug})` : `${titleBase} – ${args.sectionLabel}`;
    const description = author.description || undefined;
    const avatarMedia = getOptimalMediaFormat(author.avatar, 'medium');
    const avatarImage = avatarMedia ? formatOpenGraphImage(avatarMedia) : undefined;

    return {
        title,
        description,
        alternates: {
            canonical: absoluteRoute(`/team/${slug}/${args.sectionPath}`),
        },
        openGraph: {
            type: 'profile',
            locale: OG_LOCALE,
            siteName: OG_SITE_NAME,
            url: absoluteRoute(`/team/${slug}/${args.sectionPath}`),
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

export type AuthorContentPageProps<TItem extends {slug: string}> = {
    params: Promise<{slug: string}>;
    searchParams?: SearchParams | Promise<SearchParams>;

    sectionLabel: 'Artikel' | 'Podcasts';
    sectionPath: 'artikel' | 'podcasts';
    activeSection: AuthorSection;

    pageSize?: number;

    fetchPage: (authorSlug: string, page: number, pageSize: number, categorySlug?: string) => Promise<PaginatedResult<TItem>>;
    renderCard: (item: TItem) => ReactNode;

    emptyMessageNoFilter: string;
    emptyMessageCategoryFilter: string;
    categoryFilterLabel?: string;
};

export async function AuthorContentPage<TItem extends {slug: string}>(props: AuthorContentPageProps<TItem>) {
    const {slug: rawSlug} = await props.params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return notFound();

    const sp = await Promise.resolve(props.searchParams ?? {});
    const page = parsePageParam(sp);
    const categorySlug = parseCategoryParam(sp);
    const category = categorySlug ? await fetchCategoryBySlug(categorySlug) : null;
    const fetchedCategoryTitle = category?.base?.title ?? null;
    const categoryLabel = props.categoryFilterLabel ?? fetchedCategoryTitle ?? categorySlug;

    const author = await fetchAuthorBySlug(slug);
    if (!author) return notFound();

    const pageSize = props.pageSize ?? 12;
    const data = await props.fetchPage(slug, page, pageSize, categorySlug ?? undefined);

    const {page: currentPage, pageCount, total} = data.pagination;
    const isOutOfRange = total > 0 && page > pageCount;
    const prevPage = currentPage > 1 ? currentPage - 1 : null;
    const nextPage = currentPage < pageCount ? currentPage + 1 : null;

    const buildHref = (p: number) => {
        const qs = new URLSearchParams();
        qs.set('page', String(p));
        if (categorySlug) qs.set('category', categorySlug);
        return `/team/${slug}/${props.sectionPath}?${qs.toString()}`;
    };

    return (
        <main data-list-page>
            <AuthorHeader author={author} />
            <AuthorNav authorSlug={slug} activeSection={props.activeSection} />

            <Section title={props.sectionLabel}>
                {categorySlug ? (
                    <div className={styles.filterRow}>
                        <Link
                            href={`/kategorien/${encodeURIComponent(categorySlug)}`}
                            aria-label={`Kategorie anzeigen: ${categoryLabel}`}
                        >
                            <Tag>{categoryLabel}</Tag>
                        </Link>
                        <Link href={`/team/${slug}/${props.sectionPath}`}>Filter entfernen</Link>
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
                            message={categorySlug ? props.emptyMessageCategoryFilter : props.emptyMessageNoFilter}
                        />
                        {categorySlug ? (
                            <p>
                                <Link href={`/team/${slug}/${props.sectionPath}`}>Alle {props.sectionLabel} anzeigen</Link>
                            </p>
                        ) : null}
                    </div>
                ) : (
                    <>
                        <ContentGrid gap="comfortable">{data.items.map((item) => props.renderCard(item))}</ContentGrid>
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


