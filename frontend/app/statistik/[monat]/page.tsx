import {CaretLeftIcon, CaretRightIcon, ChartBarIcon} from '@phosphor-icons/react/dist/ssr';
import {type Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import Script from 'next/script';

import {getErrorMessage} from '@/src/lib/errors';
import {generateBreadcrumbJsonLd} from '@/src/lib/jsonld/breadcrumb';
import {stringifyJsonLd} from '@/src/lib/jsonld/helpers';
import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';
import {routes} from '@/src/lib/routes';
import {type StrapiArticle, type StrapiPodcast} from '@/src/lib/strapi/contentTypes';
import {fetchArticlesInDateRange, fetchPodcastsInDateRange} from '@/src/lib/strapiContent';
import {formatHours, formatInteger, formatMonthKey, pluralize} from '@/src/lib/statistik/statistikFormat';
import {
    adjacentMonths,
    isFutureMonth,
    isInMonth,
    monthQueryWindow,
    monthsWithContent,
    parseMonthParam,
    type StatistikMonth,
} from '@/src/lib/statistik/statistikMonth';
import {getStatistikDashboard} from '@/src/lib/statistik/statistikSource';
import {ArticleCard} from '@/src/components/ArticleCard';
import {ContentGrid} from '@/src/components/ContentGrid';
import {EmptyState} from '@/src/components/EmptyState';
import {PodcastCard} from '@/src/components/PodcastCard';
import {StatistikDashboard, StatistikIntro} from '@/src/components/StatistikDashboard';
import {StatistikStatsBar, type StatistikStat} from '@/src/components/StatistikStatsBar';

import styles from './page.module.css';

type MonthPageParams = {
    params: Promise<{monat: string}>;
};

/**
 * Pre-renders every month that has releases in the committed snapshot. The snapshot is
 * a local file, so this works without the CMS; other valid months render on demand.
 */
export async function generateStaticParams() {
    const dashboard = await getStatistikDashboard();
    return dashboard ? monthsWithContent(dashboard.heatmap).map((monat) => ({monat})) : [];
}

export async function generateMetadata({params}: MonthPageParams): Promise<Metadata> {
    const month = parseMonthParam((await params).monat);
    if (!month) return {title: 'Statistik'};
    const label = formatMonthKey(month.key);

    return buildStaticListMetadata({
        title: `${label} – Statistik`,
        description: `Alle Artikel und Podcasts von Mindestens 10 Zeichen aus dem ${label}.`,
        path: routes.statistikMonth(month.key),
        ogImageAlt: `${label} – Mindestens 10 Zeichen`,
    });
}

type MonthContent = {
    articles: StrapiArticle[];
    podcasts: StrapiPodcast[];
    failed: boolean;
};

async function loadMonthContent(month: StatistikMonth): Promise<MonthContent> {
    const {from, to} = monthQueryWindow(month);
    try {
        const [articles, podcasts] = await Promise.all([
            fetchArticlesInDateRange(from, to),
            fetchPodcastsInDateRange(from, to),
        ]);
        return {
            articles: articles.filter((article) => isInMonth(article, month)),
            podcasts: podcasts.filter((podcast) => isInMonth(podcast, month)),
            failed: false,
        };
    } catch (error) {
        console.error(`[statistik] Failed to load content for ${month.key}:`, getErrorMessage(error));
        return {articles: [], podcasts: [], failed: true};
    }
}

function buildStats(articles: StrapiArticle[], podcasts: StrapiPodcast[]): StatistikStat[] {
    const words = articles.reduce((sum, article) => sum + (article.wordCount ?? 0), 0);
    const seconds = podcasts.reduce((sum, podcast) => sum + (podcast.duration ?? 0), 0);

    return [
        {key: 'total', label: 'Veröffentlichungen', value: formatInteger(articles.length + podcasts.length)},
        {key: 'articles', label: 'Artikel', value: formatInteger(articles.length), tone: 'primary'},
        {key: 'podcasts', label: 'Podcast-Folgen', value: formatInteger(podcasts.length), tone: 'secondary'},
        {key: 'words', label: 'Geschriebene Wörter', value: formatInteger(words), tone: 'primary'},
        {key: 'runtime', label: 'Podcast-Laufzeit', value: formatHours(seconds), tone: 'secondary'},
    ];
}

type MonthLinkProps = {
    month: string | null;
    direction: 'previous' | 'next';
};

function MonthLink({month, direction}: MonthLinkProps) {
    if (!month) return <span aria-hidden='true' />;
    const label = formatMonthKey(month);
    const isPrevious = direction === 'previous';

    return (
        <Link
            href={routes.statistikMonth(month)}
            className={isPrevious ? styles.navPrevious : styles.navNext}
            rel={isPrevious ? 'prev' : 'next'}
            aria-label={`${isPrevious ? 'Voriger' : 'Nächster'} Monat mit Veröffentlichungen: ${label}`}>
            {isPrevious ? <CaretLeftIcon aria-hidden='true' /> : null}
            <span>{label}</span>
            {isPrevious ? null : <CaretRightIcon aria-hidden='true' />}
        </Link>
    );
}

function describeMonth(articles: number, podcasts: number): string {
    if (articles + podcasts === 0) return 'In diesem Monat ist nichts erschienen.';
    return `${pluralize(articles, 'Artikel', 'Artikel')} und ${pluralize(podcasts, 'Podcast-Folge', 'Podcast-Folgen')} sind in diesem Monat erschienen.`;
}

export default async function StatistikMonthPage({params}: MonthPageParams) {
    const month = parseMonthParam((await params).monat);
    if (!month || isFutureMonth(month)) return notFound();

    const [dashboard, {articles, podcasts, failed}] = await Promise.all([
        getStatistikDashboard(),
        loadMonthContent(month),
    ]);
    const label = formatMonthKey(month.key);
    const total = articles.length + podcasts.length;
    const {previous, next} = dashboard ? adjacentMonths(dashboard.heatmap, month.key) : {previous: null, next: null};

    const breadcrumbJsonLd = generateBreadcrumbJsonLd([
        {name: 'Startseite', path: routes.home},
        {name: 'Statistik', path: routes.statistik},
        {name: label, path: routes.statistikMonth(month.key)},
    ]);

    return (
        <div data-list-page>
            <Script
                id={`jsonld-breadcrumb-statistik-${month.key}`}
                type='application/ld+json'
                dangerouslySetInnerHTML={{__html: stringifyJsonLd(breadcrumbJsonLd)}}
            />

            <StatistikIntro
                title={label}
                lead={failed ? undefined : describeMonth(articles.length, podcasts.length)}
            />

            <nav className={styles.nav} aria-label='Monate'>
                <MonthLink month={previous} direction='previous' />
                <Link href={routes.statistik} className={styles.navHome}>
                    <ChartBarIcon aria-hidden='true' />
                    <span>Zur Statistik</span>
                </Link>
                <MonthLink month={next} direction='next' />
            </nav>

            {failed ? (
                <EmptyState message='Die Inhalte dieses Monats konnten gerade nicht geladen werden.' />
            ) : total === 0 ? (
                <EmptyState message='Keine Artikel oder Podcasts in diesem Monat.' />
            ) : (
                <>
                    <StatistikDashboard>
                        <StatistikStatsBar stats={buildStats(articles, podcasts)} />
                    </StatistikDashboard>

                    {articles.length > 0 ? (
                        <section>
                            <h2>{`Artikel (${articles.length})`}</h2>
                            <ContentGrid gap='comfortable'>
                                {articles.map((article) => (
                                    <ArticleCard key={article.slug} article={article} showAuthors={true} />
                                ))}
                            </ContentGrid>
                        </section>
                    ) : null}

                    {podcasts.length > 0 ? (
                        <section>
                            <h2>{`Podcasts (${podcasts.length})`}</h2>
                            <ContentGrid gap='comfortable'>
                                {podcasts.map((podcast) => (
                                    <PodcastCard key={podcast.slug} podcast={podcast} showAuthors={true} />
                                ))}
                            </ContentGrid>
                        </section>
                    ) : null}
                </>
            )}
        </div>
    );
}
