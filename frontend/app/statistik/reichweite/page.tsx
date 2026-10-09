import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr';
import {type Metadata} from 'next';
import Link from 'next/link';

import {getUmamiReachDetailStats} from '@/src/lib/analytics/umamiStatsSource';
import {
    type UmamiDetailRangeKey,
    type UmamiReachDetailStats,
    UMAMI_DETAIL_RANGE_LABELS,
    parseDetailRangeKey,
} from '@/src/lib/analytics/umamiStats';
import {getErrorMessage} from '@/src/lib/errors';
import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';
import {routes} from '@/src/lib/routes';
import {fetchArticlesBySlugsBatched, fetchPodcastsBySlugsBatched} from '@/src/lib/strapiContent';
import {EmptyState} from '@/src/components/EmptyState';
import {StatistikDashboard, StatistikIntro} from '@/src/components/StatistikDashboard';
import {
    StatistikReachDetail,
    type StatistikReachTitleMap,
} from '@/src/components/StatistikReachDetail';

import styles from './page.module.css';

/** Align ISR with Umami traffic cache (~10 min). */
export const revalidate = 600;

type ReachPageProps = {
    searchParams: Promise<{zeitraum?: string | string[]}>;
};

export async function generateMetadata({searchParams}: ReachPageProps): Promise<Metadata> {
    const rangeKey = parseDetailRangeKey(await readZeitraum(searchParams));
    const label = UMAMI_DETAIL_RANGE_LABELS[rangeKey];

    return buildStaticListMetadata({
        title: `Reichweite – ${label}`,
        description:
            'Detaillierte Umami-Statistik: Seitenaufrufe pro Artikel und Downloads pro Podcast bei Mindestens 10 Zeichen.',
        path: rangeKey === '30d' ? routes.statistikReach : `${routes.statistikReach}?zeitraum=${rangeKey}`,
        ogImageAlt: 'Reichweite – Mindestens 10 Zeichen',
    });
}

async function readZeitraum(searchParams: ReachPageProps['searchParams']): Promise<string | undefined> {
    const params = await searchParams;
    const raw = params.zeitraum;
    return Array.isArray(raw) ? raw[0] : raw;
}

async function loadTitles(
    detail: UmamiReachDetailStats,
    rangeKey: UmamiDetailRangeKey
): Promise<{articles: StatistikReachTitleMap; podcasts: StatistikReachTitleMap}> {
    const range = detail.ranges[rangeKey];
    const articleSlugs = range.articles.map((entry) => entry.slug);
    const podcastSlugs = range.podcasts.map((entry) => entry.slug);

    try {
        const [articles, podcasts] = await Promise.all([
            articleSlugs.length > 0 ? fetchArticlesBySlugsBatched(articleSlugs) : Promise.resolve([]),
            podcastSlugs.length > 0 ? fetchPodcastsBySlugsBatched(podcastSlugs) : Promise.resolve([]),
        ]);

        const articleTitles: StatistikReachTitleMap = {};
        for (const article of articles) {
            if (article.slug && article.title) articleTitles[article.slug] = article.title;
        }
        const podcastTitles: StatistikReachTitleMap = {};
        for (const podcast of podcasts) {
            if (podcast.slug && podcast.title) podcastTitles[podcast.slug] = podcast.title;
        }
        return {articles: articleTitles, podcasts: podcastTitles};
    } catch (error) {
        // Titles are nice-to-have; rankings still render with slugs.
        console.warn('[statistik/reichweite] Failed to resolve content titles:', getErrorMessage(error));
        return {articles: {}, podcasts: {}};
    }
}

export default async function StatistikReachPage({searchParams}: ReachPageProps) {
    const rangeKey = parseDetailRangeKey(await readZeitraum(searchParams));
    const detail = await getUmamiReachDetailStats();
    const titles = detail ? await loadTitles(detail, rangeKey) : null;

    return (
        <div data-list-page>
            <nav className={styles.nav} aria-label='Statistik-Navigation'>
                <Link className={styles.navHome} href={routes.statistik}>
                    <CaretLeftIcon weight='bold' aria-hidden='true' />
                    Zur Statistik
                </Link>
            </nav>

            <StatistikIntro
                title='Reichweite'
                lead='Seitenaufrufe pro Artikel und Downloads pro Podcast – detaillierter als auf der Übersichtsseite.'
                meta={<>Zeitraum: {UMAMI_DETAIL_RANGE_LABELS[rangeKey]}</>}
            />

            {detail && titles ? (
                <StatistikDashboard>
                    <StatistikReachDetail
                        detail={detail}
                        rangeKey={rangeKey}
                        articleTitles={titles.articles}
                        podcastTitles={titles.podcasts}
                    />
                </StatistikDashboard>
            ) : (
                <EmptyState message='Aktuell liegen keine Reichweiten-Daten vor.' />
            )}
        </div>
    );
}
