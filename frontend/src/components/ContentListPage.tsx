import {type ReactNode} from 'react';
import Link from 'next/link';

import {ContentGrid} from './ContentGrid';
import {Card} from './Card';
import {Pagination} from './Pagination';

import {parsePageParam} from '@/src/lib/params';
import {getErrorMessage} from '@/src/lib/errors';
import {type PaginatedResult} from '@/src/lib/strapiContent';

const PAGE_SIZE = 12;

type SearchParams = Record<string, string | string[] | undefined>;

type ContentListPageProps<TItem extends {slug: string}> = {
    /** Heading and noun used in the German state messages (e.g. "Artikel"). */
    title: string;
    /** Route prefix for pagination, retry, and reset links (e.g. "/artikel"). */
    basePath: string;
    searchParams?: SearchParams | Promise<SearchParams>;
    fetchPage: (options: {page: number; pageSize: number}) => Promise<PaginatedResult<TItem>>;
    renderCard: (item: TItem) => ReactNode;
};

/**
 * Shared paginated list page for articles and podcasts. Handles the error,
 * out-of-range, empty, and populated states in one place so both list pages
 * stay behaviourally identical; callers only supply title, base path, fetcher,
 * and card renderer.
 */
export async function ContentListPage<TItem extends {slug: string}>({
                                                                        title,
                                                                        basePath,
                                                                        searchParams,
                                                                        fetchPage,
                                                                        renderCard,
                                                                    }: ContentListPageProps<TItem>) {
    const sp = await Promise.resolve(searchParams ?? {});
    const currentPage = parsePageParam(sp);

    let data;
    try {
        data = await fetchPage({page: currentPage, pageSize: PAGE_SIZE});
    } catch (error) {
        console.error(`ContentListPage: failed to load ${title} for page ${currentPage}:`, getErrorMessage(error));
        return (
            <section data-list-page>
                <h1>{title}</h1>
                <Card variant="empty">
                    <p>Fehler beim Laden der {title}.</p>
                    <Link href={basePath} style={{marginTop: '1rem', padding: '0.5rem 1rem', display: 'inline-block'}}>
                        Erneut versuchen
                    </Link>
                </Card>
            </section>
        );
    }

    // Out-of-range pages (e.g. /artikel?page=999) must not be presented as
    // "no content found" — that is misleading when content exists.
    if (data && data.items.length === 0 && data.pagination.total > 0 && currentPage > data.pagination.pageCount) {
        return (
            <section data-list-page>
                <h1>{title}</h1>
                <Card variant="empty">
                    <p>Diese Seite existiert nicht.</p>
                    <Link href={basePath} style={{marginTop: '1rem', padding: '0.5rem 1rem', display: 'inline-block'}}>
                        Zur ersten Seite
                    </Link>
                </Card>
            </section>
        );
    }

    // Handle empty state
    if (!data || data.items.length === 0) {
        return (
            <section data-list-page>
                <h1>{title}</h1>
                <p>Keine {title} gefunden.</p>
            </section>
        );
    }

    const {page, pageCount} = data.pagination;
    const prevPage = page > 1 ? page - 1 : null;
    const nextPage = page < pageCount ? page + 1 : null;

    return (
        <section data-list-page>
            <h1>{title}</h1>
            <ContentGrid gap="comfortable">
                {data.items.map((item) => renderCard(item))}
            </ContentGrid>
            {data.items.length > 0 && pageCount > 1 && (
                <Pagination
                    currentPage={page}
                    totalPages={pageCount}
                    previousHref={prevPage ? `${basePath}?page=${prevPage}` : undefined}
                    nextHref={nextPage ? `${basePath}?page=${nextPage}` : undefined}
                />
            )}
        </section>
    );
}
