import {type Metadata} from 'next';

import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';
import {routes} from '@/src/lib/routes';
import {getStatistikDashboard} from '@/src/lib/statistik/statistikSource';
import {
    GERMAN_WEEKDAYS,
    formatInteger,
    formatMinutes,
    formatSnapshotDate,
    pluralize,
} from '@/src/lib/statistik/statistikFormat';
import {type StatistikBreakdownEntry} from '@/src/lib/statistik/types';
import {EmptyState} from '@/src/components/EmptyState';
import {StatistikBarList, type StatistikBarListItem} from '@/src/components/StatistikBarList';
import {StatistikGrowthChart} from '@/src/components/StatistikGrowthChart';
import {StatistikHeatmap} from '@/src/components/StatistikHeatmap';
import {StatistikPanel} from '@/src/components/StatistikPanel';
import {StatistikRecords} from '@/src/components/StatistikRecords';
import {StatistikStatsBar} from '@/src/components/StatistikStatsBar';
import {StatistikTopList} from '@/src/components/StatistikTopList';
import {StatistikYearChart} from '@/src/components/StatistikYearChart';

import styles from './page.module.css';

const BREAKDOWN_LIMIT = 12;

export const metadata: Metadata = buildStaticListMetadata({
    title: 'Statistik',
    description: 'Zahlen und Fakten zu allen Artikeln und Podcasts von Mindestens 10 Zeichen.',
    path: routes.statistik,
    ogImageAlt: 'Statistik – Mindestens 10 Zeichen',
});

function describeCounts(entry: {articles: number; podcasts: number}): string {
    return `${pluralize(entry.articles, 'Artikel', 'Artikel')}, ${pluralize(entry.podcasts, 'Podcast', 'Podcasts')}`;
}

function toBreakdownItems(
    entries: StatistikBreakdownEntry[],
    href: (slug: string) => string
): StatistikBarListItem[] {
    const nameCounts = new Map<string, number>();
    for (const entry of entries) nameCounts.set(entry.name, (nameCounts.get(entry.name) ?? 0) + 1);

    return entries.slice(0, BREAKDOWN_LIMIT).map((entry) => ({
        key: entry.slug,
        // Two authors may share a display name; the slug keeps them apart.
        label: (nameCounts.get(entry.name) ?? 0) > 1 ? `${entry.name} (${entry.slug})` : entry.name,
        href: href(entry.slug),
        articles: entry.articles,
        podcasts: entry.podcasts,
        value: entry.total,
        title: `${entry.name}: ${describeCounts(entry)}`,
    }));
}

function limitDescription(total: number, noun: string): string | undefined {
    return total > BREAKDOWN_LIMIT ? `Die ${BREAKDOWN_LIMIT} aktivsten von ${formatInteger(total)} ${noun}.` : undefined;
}

export default async function StatistikPage() {
    const dashboard = await getStatistikDashboard();

    if (!dashboard || dashboard.totals.total === 0) {
        return (
            <div data-list-page>
                <h1>Statistik</h1>
                <EmptyState message='Aktuell liegen keine Statistikdaten vor.' />
            </div>
        );
    }

    const {totals} = dashboard;

    const weekdayItems: StatistikBarListItem[] = dashboard.weekdays.map((weekday) => ({
        key: String(weekday.weekday),
        label: GERMAN_WEEKDAYS[weekday.weekday] ?? String(weekday.weekday),
        articles: weekday.articles,
        podcasts: weekday.podcasts,
        value: weekday.total,
        title: `${GERMAN_WEEKDAYS[weekday.weekday]}: ${describeCounts(weekday)}`,
    }));

    const wordItems: StatistikBarListItem[] = dashboard.wordBuckets.map((bucket) => ({
        key: bucket.label,
        label: bucket.label,
        value: bucket.count,
    }));

    const durationItems: StatistikBarListItem[] = dashboard.durationBuckets.map((bucket) => ({
        key: bucket.label,
        label: bucket.label,
        value: bucket.count,
    }));

    return (
        <div data-list-page>
            <header className={styles.intro}>
                <h1>Statistik</h1>
                <p className={styles.lead}>
                    {formatInteger(totals.articles)} Artikel, {formatInteger(totals.podcasts)} Podcast-Folgen und
                    jede Menge Zeichen – Mindestens 10 Zeichen in Zahlen.
                </p>
                <p className={styles.meta}>
                    Stand: <time dateTime={dashboard.generatedAt}>{formatSnapshotDate(dashboard.generatedAt)}</time>
                </p>
            </header>

            <div className={styles.dashboard}>
                <StatistikStatsBar totals={totals} />
                <StatistikRecords records={dashboard.records} totals={totals} />
                <StatistikHeatmap heatmap={dashboard.heatmap} />

                <div className={styles.columns}>
                    <StatistikYearChart years={dashboard.years} />
                    <StatistikGrowthChart points={dashboard.cumulative} />
                </div>

                <div className={styles.columns3}>
                    <StatistikPanel
                        title='Wochentage'
                        description='An welchen Tagen erscheinen neue Inhalte?'
                        legend>
                        <StatistikBarList items={weekdayItems} highlightMax />
                    </StatistikPanel>
                    <StatistikPanel title='Artikellänge' description='Verteilung der Wortanzahl pro Artikel.'>
                        <StatistikBarList items={wordItems} tone='article' highlightMax />
                    </StatistikPanel>
                    <StatistikPanel title='Folgenlänge' description='Verteilung der Laufzeit pro Podcast-Folge.'>
                        <StatistikBarList items={durationItems} tone='podcast' highlightMax />
                    </StatistikPanel>
                </div>

                <div className={styles.columns}>
                    <StatistikPanel title='Die längsten Artikel'>
                        <StatistikTopList
                            entries={dashboard.longestArticles}
                            href={routes.article}
                            formatValue={(value) => `${formatInteger(value)} Wörter`}
                            tone='article'
                        />
                    </StatistikPanel>
                    <StatistikPanel title='Die längsten Podcasts'>
                        <StatistikTopList
                            entries={dashboard.longestPodcasts}
                            href={routes.podcast}
                            formatValue={formatMinutes}
                            tone='podcast'
                        />
                    </StatistikPanel>
                </div>

                <div className={styles.columns}>
                    <StatistikPanel
                        title='Kategorien'
                        description={limitDescription(dashboard.categories.length, 'Kategorien')}
                        legend>
                        <StatistikBarList items={toBreakdownItems(dashboard.categories, routes.category)} />
                    </StatistikPanel>
                    <StatistikPanel
                        title='AutorInnen'
                        description={limitDescription(dashboard.authors.length, 'AutorInnen')}
                        legend>
                        <StatistikBarList items={toBreakdownItems(dashboard.authors, routes.author)} />
                    </StatistikPanel>
                </div>
            </div>
        </div>
    );
}
