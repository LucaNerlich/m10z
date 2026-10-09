import Link from 'next/link';

import {
    type UmamiDetailRangeKey,
    type UmamiReachDetailRange,
    type UmamiReachDetailStats,
    UMAMI_DETAIL_RANGE_KEYS,
    UMAMI_DETAIL_RANGE_LABELS,
} from '@/src/lib/analytics/umamiStats';
import {routes} from '@/src/lib/routes';
import {formatInteger, formatSnapshotDate} from '@/src/lib/statistik/statistikFormat';

import {StatistikBarList, type StatistikBarListItem} from './StatistikBarList';
import {StatistikColumns} from './StatistikDashboard';
import {StatistikPanel} from './StatistikPanel';
import {StatistikStatsBar, type StatistikStat} from './StatistikStatsBar';
import styles from './StatistikReachDetail.module.css';

export type StatistikReachTitleMap = Record<string, string>;

type StatistikReachDetailProps = {
    detail: UmamiReachDetailStats;
    rangeKey: UmamiDetailRangeKey;
    articleTitles: StatistikReachTitleMap;
    podcastTitles: StatistikReachTitleMap;
};

function rangeHref(key: UmamiDetailRangeKey): string {
    if (key === '30d') return routes.statistikReach;
    return `${routes.statistikReach}?zeitraum=${key}`;
}

function toArticleItems(
    range: UmamiReachDetailRange,
    titles: StatistikReachTitleMap
): StatistikBarListItem[] {
    return range.articles.map((article) => {
        const title = titles[article.slug];
        const label = title ?? article.slug;
        return {
            key: article.slug,
            label,
            href: routes.article(article.slug),
            value: article.pageviews,
            title: `${label}: ${formatInteger(article.pageviews)} Seitenaufrufe`,
        };
    });
}

function toPodcastItems(
    range: UmamiReachDetailRange,
    titles: StatistikReachTitleMap
): StatistikBarListItem[] {
    return range.podcasts.map((episode) => {
        const title = titles[episode.slug];
        const label = title ?? episode.slug;
        return {
            key: episode.slug,
            label,
            href: routes.podcast(episode.slug),
            value: episode.downloads,
            title: `${label}: ${formatInteger(episode.downloads)} Downloads`,
        };
    });
}

/**
 * Multi-range Umami detail: site totals plus long article/podcast rankings.
 */
export function StatistikReachDetail({
    detail,
    rangeKey,
    articleTitles,
    podcastTitles,
}: StatistikReachDetailProps) {
    const range = detail.ranges[rangeKey];
    const rangeLabel = UMAMI_DETAIL_RANGE_LABELS[rangeKey];
    const articleItems = toArticleItems(range, articleTitles);
    const podcastItems = toPodcastItems(range, podcastTitles);

    const stats: StatistikStat[] = [
        {key: 'visitors', label: 'Besucher', value: formatInteger(range.visitors), tone: 'primary'},
        {key: 'visits', label: 'Besuche', value: formatInteger(range.visits), tone: 'secondary'},
        {key: 'pageviews', label: 'Seitenaufrufe', value: formatInteger(range.pageviews), tone: 'primary'},
        {
            key: 'articles',
            label: 'Artikel mit Aufrufen',
            value: formatInteger(range.articles.length),
            tone: 'primary',
        },
        {
            key: 'podcasts',
            label: 'Podcasts mit Downloads',
            value: formatInteger(range.podcasts.length),
            tone: 'secondary',
        },
    ];

    return (
        <>
            <nav className={styles.rangeNav} aria-label='Zeitraum'>
                {UMAMI_DETAIL_RANGE_KEYS.map((key) => {
                    const active = key === rangeKey;
                    return (
                        <Link
                            key={key}
                            href={rangeHref(key)}
                            className={active ? `${styles.rangeLink} ${styles.rangeLinkActive}` : styles.rangeLink}
                            aria-current={active ? 'page' : undefined}>
                            {UMAMI_DETAIL_RANGE_LABELS[key]}
                        </Link>
                    );
                })}
            </nav>

            <StatistikPanel
                title='Website-Reichweite'
                description={<>Gesamte Website · Zeitraum {rangeLabel}.</>}>
                <StatistikStatsBar stats={stats} />
                <p className={styles.meta}>
                    Aktualisiert ca. alle 10 Minuten · Stand:{' '}
                    <time dateTime={detail.cachedAt}>{formatSnapshotDate(detail.cachedAt)}</time>
                </p>
            </StatistikPanel>

            {/* Remount lists when the range changes so Soft Navigation cannot leave stale rows. */}
            <StatistikColumns key={rangeKey}>
                <StatistikPanel
                    title='Artikel'
                    description={
                        articleItems.length > 0
                            ? `Seitenaufrufe pro Artikel · ${rangeLabel} (bis zu ${formatInteger(articleItems.length)} Einträge).`
                            : `Keine Artikel-Aufrufe · Zeitraum ${rangeLabel}.`
                    }>
                    {articleItems.length > 0 ? (
                        <StatistikBarList items={articleItems} tone='primary' />
                    ) : (
                        <p className={styles.empty}>Noch keine Daten für diesen Zeitraum.</p>
                    )}
                </StatistikPanel>
                <StatistikPanel
                    title='Podcasts'
                    description={
                        podcastItems.length > 0
                            ? `Downloads pro Podcast · ${rangeLabel} (bis zu ${formatInteger(podcastItems.length)} Einträge).`
                            : `Keine Podcast-Downloads · Zeitraum ${rangeLabel}.`
                    }>
                    {podcastItems.length > 0 ? (
                        <StatistikBarList items={podcastItems} tone='secondary' />
                    ) : (
                        <p className={styles.empty}>Noch keine Daten für diesen Zeitraum.</p>
                    )}
                </StatistikPanel>
            </StatistikColumns>
        </>
    );
}
