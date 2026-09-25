import {CalendarCheckIcon, FireIcon, HourglassIcon, RocketLaunchIcon, TrophyIcon} from '@phosphor-icons/react/dist/ssr';
import {type Metadata} from 'next';

import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';
import {routes} from '@/src/lib/routes';
import {getStatistikDashboard} from '@/src/lib/statistik/statistikSource';
import {
    GERMAN_WEEKDAYS,
    formatCalendarDate,
    formatDecimal,
    formatHours,
    formatInteger,
    formatMinutes,
    formatMonthKey,
    formatSnapshotDate,
    pluralize,
} from '@/src/lib/statistik/statistikFormat';
import {
    type StatistikBreakdownEntry,
    type StatistikRecords as StatistikRecordsData,
    type StatistikTopEntry,
    type StatistikTotals,
} from '@/src/lib/statistik/types';
import {EmptyState} from '@/src/components/EmptyState';
import {StatistikBarList, type StatistikBarListItem} from '@/src/components/StatistikBarList';
import {StatistikColumns, StatistikDashboard, StatistikIntro} from '@/src/components/StatistikDashboard';
import {StatistikGrowthChart} from '@/src/components/StatistikGrowthChart';
import {StatistikHeatmap} from '@/src/components/StatistikHeatmap';
import {StatistikPanel} from '@/src/components/StatistikPanel';
import {StatistikRecords, type StatistikRecordCard} from '@/src/components/StatistikRecords';
import {StatistikStatsBar, type StatistikStat} from '@/src/components/StatistikStatsBar';
import {StatistikTopList, type StatistikTopListItem} from '@/src/components/StatistikTopList';
import {StatistikYearChart} from '@/src/components/StatistikYearChart';

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
        primary: entry.articles,
        secondary: entry.podcasts,
        value: entry.total,
        title: `${entry.name}: ${describeCounts(entry)}`,
    }));
}

function limitDescription(total: number, noun: string): string | undefined {
    return total > BREAKDOWN_LIMIT ? `Die ${BREAKDOWN_LIMIT} aktivsten von ${formatInteger(total)} ${noun}.` : undefined;
}

function buildStats(totals: StatistikTotals): StatistikStat[] {
    return [
        {key: 'total', label: 'Veröffentlichungen', value: formatInteger(totals.total)},
        {key: 'articles', label: 'Artikel', value: formatInteger(totals.articles), tone: 'primary'},
        {key: 'podcasts', label: 'Podcast-Folgen', value: formatInteger(totals.podcasts), tone: 'secondary'},
        {key: 'words', label: 'Geschriebene Wörter', value: formatInteger(totals.articleWords), tone: 'primary'},
        {key: 'runtime', label: 'Podcast-Laufzeit', value: formatHours(totals.podcastSeconds), tone: 'secondary'},
        {key: 'avgWords', label: 'Ø Wörter pro Artikel', value: formatInteger(totals.avgWordsPerArticle)},
        {key: 'avgDuration', label: 'Ø Folgenlänge', value: formatMinutes(totals.avgPodcastSeconds)},
        {key: 'perMonth', label: 'Ø pro Monat', value: formatDecimal(totals.avgReleasesPerMonth)},
        {key: 'authors', label: 'Aktive AutorInnen', value: formatInteger(totals.activeAuthors)},
        {key: 'categories', label: 'Kategorien', value: formatInteger(totals.activeCategories)},
    ];
}

function buildRecordCards(records: StatistikRecordsData, totals: StatistikTotals): StatistikRecordCard[] {
    const cards: StatistikRecordCard[] = [];

    if (records.busiestMonth) {
        cards.push({
            key: 'month',
            icon: <FireIcon weight='duotone' />,
            label: 'Aktivster Monat',
            value: formatMonthKey(records.busiestMonth.month),
            detail: pluralize(records.busiestMonth.total, 'Veröffentlichung', 'Veröffentlichungen'),
        });
    }
    if (records.busiestYear) {
        cards.push({
            key: 'year',
            icon: <TrophyIcon weight='duotone' />,
            label: 'Stärkstes Jahr',
            value: String(records.busiestYear.year),
            detail: pluralize(records.busiestYear.total, 'Veröffentlichung', 'Veröffentlichungen'),
        });
    }
    if (records.longestMonthStreak) {
        cards.push({
            key: 'streak',
            icon: <CalendarCheckIcon weight='duotone' />,
            label: 'Längste Serie',
            value: pluralize(records.longestMonthStreak.months, 'Monat', 'Monate'),
            detail: `ohne Pause, ${formatMonthKey(records.longestMonthStreak.from)} – ${formatMonthKey(records.longestMonthStreak.to)}`,
        });
    }
    if (records.longestGap && records.longestGap.days > 0) {
        cards.push({
            key: 'gap',
            icon: <HourglassIcon weight='duotone' />,
            label: 'Längste Pause',
            value: `${formatInteger(records.longestGap.days)} Tage`,
            detail: `${formatCalendarDate(records.longestGap.from)} – ${formatCalendarDate(records.longestGap.to)}`,
        });
    }
    if (totals.firstReleaseDate) {
        cards.push({
            key: 'first',
            icon: <RocketLaunchIcon weight='duotone' />,
            label: 'Erste Veröffentlichung',
            value: formatCalendarDate(totals.firstReleaseDate),
            detail: totals.latestReleaseDate
                ? `zuletzt am ${formatCalendarDate(totals.latestReleaseDate)}`
                : 'seitdem nichts Neues',
        });
    }

    return cards;
}

function toTopListItems(
    entries: StatistikTopEntry[],
    href: (slug: string) => string,
    formatValue: (value: number) => string
): StatistikTopListItem[] {
    return entries.map((entry) => ({
        key: entry.slug,
        title: entry.title,
        href: href(entry.slug),
        meta: <time dateTime={entry.date}>{formatCalendarDate(entry.date)}</time>,
        value: formatValue(entry.value),
    }));
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
        primary: weekday.articles,
        secondary: weekday.podcasts,
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
            <StatistikIntro
                title='Statistik'
                lead={
                    <>
                        {formatInteger(totals.articles)} Artikel, {formatInteger(totals.podcasts)} Podcast-Folgen und
                        jede Menge Zeichen – Mindestens 10 Zeichen in Zahlen.
                    </>
                }
                meta={
                    <>
                        Stand: <time dateTime={dashboard.generatedAt}>{formatSnapshotDate(dashboard.generatedAt)}</time>
                    </>
                }
            />

            <StatistikDashboard>
                <StatistikStatsBar stats={buildStats(totals)} />
                <StatistikRecords cards={buildRecordCards(dashboard.records, totals)} />
                <StatistikHeatmap heatmap={dashboard.heatmap} />

                <StatistikColumns>
                    <StatistikYearChart years={dashboard.years} />
                    <StatistikGrowthChart points={dashboard.cumulative} />
                </StatistikColumns>

                <StatistikColumns narrow>
                    <StatistikPanel
                        title='Wochentage'
                        description='An welchen Tagen erscheinen neue Inhalte?'
                        legend>
                        <StatistikBarList items={weekdayItems} highlightMax />
                    </StatistikPanel>
                    <StatistikPanel title='Artikellänge' description='Verteilung der Wortanzahl pro Artikel.'>
                        <StatistikBarList items={wordItems} tone='primary' highlightMax />
                    </StatistikPanel>
                    <StatistikPanel title='Folgenlänge' description='Verteilung der Laufzeit pro Podcast-Folge.'>
                        <StatistikBarList items={durationItems} tone='secondary' highlightMax />
                    </StatistikPanel>
                </StatistikColumns>

                <StatistikColumns>
                    <StatistikPanel title='Die längsten Artikel'>
                        <StatistikTopList
                            items={toTopListItems(
                                dashboard.longestArticles,
                                routes.article,
                                (value) => `${formatInteger(value)} Wörter`
                            )}
                        />
                    </StatistikPanel>
                    <StatistikPanel title='Die längsten Podcasts'>
                        <StatistikTopList
                            items={toTopListItems(dashboard.longestPodcasts, routes.podcast, formatMinutes)}
                            tone='secondary'
                        />
                    </StatistikPanel>
                </StatistikColumns>

                <StatistikColumns>
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
                </StatistikColumns>
            </StatistikDashboard>
        </div>
    );
}
