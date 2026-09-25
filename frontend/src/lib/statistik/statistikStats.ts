import {
    type StatistikBreakdownEntry,
    type StatistikBucket,
    type StatistikCounts,
    type StatistikCumulativePoint,
    type StatistikDashboard,
    type StatistikHeatmap,
    type StatistikRecords,
    type StatistikSnapshot,
    type StatistikTopEntry,
    type StatistikWeekday,
    type StatistikYear,
} from './types';

// All calendar maths happens in the publication's home time zone so that an
// article dated "midnight Berlin" (e.g. 2018-12-17T23:00:00Z) lands on the right day.
const TIME_ZONE = 'Europe/Berlin';
const DAY_MS = 24 * 60 * 60 * 1000;
const TOP_LIMIT = 5;

/**
 * Releases kept in the snapshot (it mirrors prod) but left out of every figure.
 * `pyre` is a lone 2018 article that predates M10Z (2023+) and skews the timeline.
 */
export const STATISTIK_EXCLUDED: {readonly articles: readonly string[]; readonly podcasts: readonly string[]} = {
    articles: ['pyre'],
    podcasts: [],
};

const WEEKDAY_INDEX: Record<string, number> = {Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6};

const partsFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
});

type CalendarParts = {
    year: number;
    /** 1–12 */
    month: number;
    day: number;
    /** 0 = Monday … 6 = Sunday */
    weekday: number;
};

export function toCalendarParts(iso: string): CalendarParts {
    const parts = partsFormatter.formatToParts(new Date(iso));
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
    return {
        year: Number(get('year')),
        month: Number(get('month')),
        day: Number(get('day')),
        weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
    };
}

export function toMonthKey(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
}

function monthIndex(year: number, month: number): number {
    return year * 12 + (month - 1);
}

function fromMonthIndex(index: number): {year: number; month: number} {
    return {year: Math.floor(index / 12), month: (index % 12) + 1};
}

/** Whole calendar days between two Berlin dates (DST-safe, uses UTC day numbers). */
function calendarDayNumber(parts: CalendarParts): number {
    return Math.round(Date.UTC(parts.year, parts.month - 1, parts.day) / DAY_MS);
}

function round(value: number, digits = 0): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function emptyCounts(): StatistikCounts {
    return {articles: 0, podcasts: 0, total: 0};
}

type Release = {
    kind: 'article' | 'podcast';
    slug: string;
    title: string;
    date: string;
    parts: CalendarParts;
    authors: string[];
    categories: string[];
    wordCount: number | null;
    duration: number | null;
};

function addTo(counts: StatistikCounts, kind: Release['kind']): void {
    if (kind === 'article') counts.articles += 1;
    else counts.podcasts += 1;
    counts.total += 1;
}

export type StatistikBucketDefinition = {label: string; min: number; max: number};

export const WORD_BUCKETS: StatistikBucketDefinition[] = [
    {label: '< 500', min: 0, max: 500},
    {label: '500–999', min: 500, max: 1000},
    {label: '1.000–1.999', min: 1000, max: 2000},
    {label: '2.000–2.999', min: 2000, max: 3000},
    {label: '3.000–4.999', min: 3000, max: 5000},
    {label: '≥ 5.000', min: 5000, max: Infinity},
];

export const DURATION_BUCKETS: StatistikBucketDefinition[] = [
    {label: '< 30 Min.', min: 0, max: 30 * 60},
    {label: '30–59 Min.', min: 30 * 60, max: 60 * 60},
    {label: '60–89 Min.', min: 60 * 60, max: 90 * 60},
    {label: '90–119 Min.', min: 90 * 60, max: 120 * 60},
    {label: '2–3 Std.', min: 120 * 60, max: 180 * 60},
    {label: '≥ 3 Std.', min: 180 * 60, max: Infinity},
];

export function bucketize(values: number[], definitions: StatistikBucketDefinition[]): StatistikBucket[] {
    return definitions.map((definition) => ({
        label: definition.label,
        count: values.filter((value) => value >= definition.min && value < definition.max).length,
    }));
}

function topEntries(releases: Release[], pick: (release: Release) => number | null): StatistikTopEntry[] {
    return releases
        .map((release) => ({release, value: pick(release)}))
        .filter((entry): entry is {release: Release; value: number} => entry.value !== null && entry.value > 0)
        .sort((a, b) => b.value - a.value || a.release.date.localeCompare(b.release.date))
        .slice(0, TOP_LIMIT)
        .map(({release, value}) => ({slug: release.slug, title: release.title, date: release.date, value}));
}

function buildBreakdown(
    releases: Release[],
    names: Map<string, string>,
    pick: (release: Release) => string[],
): StatistikBreakdownEntry[] {
    const counts = new Map<string, StatistikCounts>();
    for (const release of releases) {
        for (const slug of pick(release)) {
            const entry = counts.get(slug) ?? emptyCounts();
            addTo(entry, release.kind);
            counts.set(slug, entry);
        }
    }
    return Array.from(counts.entries())
        .map(([slug, entry]) => ({slug, name: names.get(slug) ?? slug, ...entry}))
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'de'));
}

function buildRecords(
    releases: Release[],
    monthCounts: Map<number, StatistikCounts>,
    years: StatistikYear[],
): StatistikRecords {
    let busiestMonth: StatistikRecords['busiestMonth'] = null;
    for (const [index, counts] of Array.from(monthCounts.entries()).sort((a, b) => a[0] - b[0])) {
        if (!busiestMonth || counts.total > busiestMonth.total) {
            const {year, month} = fromMonthIndex(index);
            busiestMonth = {month: toMonthKey(year, month), total: counts.total};
        }
    }

    let busiestYear: StatistikRecords['busiestYear'] = null;
    for (const year of years) {
        if (!busiestYear || year.total > busiestYear.total) busiestYear = {year: year.year, total: year.total};
    }

    let longestGap: StatistikRecords['longestGap'] = null;
    for (let i = 1; i < releases.length; i += 1) {
        const days = calendarDayNumber(releases[i].parts) - calendarDayNumber(releases[i - 1].parts);
        if (!longestGap || days > longestGap.days) {
            longestGap = {days, from: releases[i - 1].date, to: releases[i].date};
        }
    }

    let longestMonthStreak: StatistikRecords['longestMonthStreak'] = null;
    const activeMonths = Array.from(monthCounts.keys()).sort((a, b) => a - b);
    let streakStart = 0;
    for (let i = 0; i < activeMonths.length; i += 1) {
        if (i > 0 && activeMonths[i] !== activeMonths[i - 1] + 1) streakStart = i;
        const months = i - streakStart + 1;
        if (!longestMonthStreak || months > longestMonthStreak.months) {
            const from = fromMonthIndex(activeMonths[streakStart]);
            const to = fromMonthIndex(activeMonths[i]);
            longestMonthStreak = {
                months,
                from: toMonthKey(from.year, from.month),
                to: toMonthKey(to.year, to.month),
            };
        }
    }

    return {busiestMonth, busiestYear, longestGap, longestMonthStreak};
}

/**
 * Pure: snapshot → every figure rendered on `/statistik`. Deterministic for a given
 * snapshot (the "now" reference is the snapshot's `generatedAt`, never the clock).
 */
export function buildStatistikDashboard(
    snapshot: StatistikSnapshot,
    excluded: typeof STATISTIK_EXCLUDED = STATISTIK_EXCLUDED
): StatistikDashboard {
    const excludedArticles = new Set(excluded.articles);
    const excludedPodcasts = new Set(excluded.podcasts);
    const releases: Release[] = [
        ...snapshot.articles
            .filter((article) => !excludedArticles.has(article.slug))
            .map((article) => ({
            kind: 'article' as const,
            slug: article.slug,
            title: article.title,
            date: article.date,
            parts: toCalendarParts(article.date),
            authors: article.authors,
            categories: article.categories,
            wordCount: article.wordCount,
            duration: null,
        })),
        ...snapshot.podcasts
            .filter((podcast) => !excludedPodcasts.has(podcast.slug))
            .map((podcast) => ({
            kind: 'podcast' as const,
            slug: podcast.slug,
            title: podcast.title,
            date: podcast.date,
            parts: toCalendarParts(podcast.date),
            authors: podcast.authors,
            categories: podcast.categories,
            wordCount: null,
            duration: podcast.duration,
        })),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug));

    const articles = releases.filter((release) => release.kind === 'article');
    const podcasts = releases.filter((release) => release.kind === 'podcast');
    const wordCounts = articles.map((a) => a.wordCount).filter((v): v is number => v !== null && v > 0);
    const durations = podcasts.map((p) => p.duration).filter((v): v is number => v !== null && v > 0);
    const articleWords = wordCounts.reduce((sum, value) => sum + value, 0);
    const podcastSeconds = durations.reduce((sum, value) => sum + value, 0);

    const first = releases[0] ?? null;
    const latest = releases[releases.length - 1] ?? null;
    const generatedParts = toCalendarParts(snapshot.generatedAt);
    const firstMonth = first ? monthIndex(first.parts.year, first.parts.month) : null;
    const generatedMonth = monthIndex(generatedParts.year, generatedParts.month);
    const latestMonth = latest ? monthIndex(latest.parts.year, latest.parts.month) : null;
    const endMonth = latestMonth !== null ? Math.max(latestMonth, generatedMonth) : generatedMonth;

    // Per-month and per-year aggregates.
    const monthCounts = new Map<number, StatistikCounts>();
    const yearMap = new Map<number, StatistikYear>();
    const weekdays: StatistikWeekday[] = Array.from({length: 7}, (_, weekday) => ({weekday, ...emptyCounts()}));
    for (const release of releases) {
        const index = monthIndex(release.parts.year, release.parts.month);
        const month = monthCounts.get(index) ?? emptyCounts();
        addTo(month, release.kind);
        monthCounts.set(index, month);

        const year = yearMap.get(release.parts.year) ?? {
            year: release.parts.year,
            ...emptyCounts(),
            articleWords: 0,
            podcastSeconds: 0,
        };
        addTo(year, release.kind);
        year.articleWords += release.wordCount ?? 0;
        year.podcastSeconds += release.duration ?? 0;
        yearMap.set(release.parts.year, year);

        addTo(weekdays[release.parts.weekday], release.kind);
    }

    const years: StatistikYear[] = [];
    const lastYear = fromMonthIndex(endMonth).year;
    for (let year = first?.parts.year ?? lastYear + 1; year <= lastYear; year += 1) {
        years.push(yearMap.get(year) ?? {year, ...emptyCounts(), articleWords: 0, podcastSeconds: 0});
    }

    const heatmap: StatistikHeatmap = {rows: [], monthTotals: Array.from({length: 12}, () => 0), maxCell: 0};
    if (first) {
        for (const year of years) {
            const cells = Array.from({length: 12}, (_, i) => {
                const index = monthIndex(year.year, i + 1);
                const counts = monthCounts.get(index) ?? emptyCounts();
                heatmap.monthTotals[i] += counts.total;
                heatmap.maxCell = Math.max(heatmap.maxCell, counts.total);
                return {
                    month: toMonthKey(year.year, i + 1),
                    ...counts,
                    inRange: firstMonth !== null && index >= firstMonth && index <= endMonth,
                };
            });
            heatmap.rows.push({year: year.year, cells, total: year.total});
        }
    }

    const cumulative: StatistikCumulativePoint[] = [];
    if (firstMonth !== null) {
        const running = emptyCounts();
        for (let index = firstMonth; index <= endMonth; index += 1) {
            const counts = monthCounts.get(index);
            if (counts) {
                running.articles += counts.articles;
                running.podcasts += counts.podcasts;
                running.total += counts.total;
            }
            const {year, month} = fromMonthIndex(index);
            cumulative.push({month: toMonthKey(year, month), ...running});
        }
    }

    const authorNames = new Map(snapshot.authors.map((author) => [author.slug, author.name]));
    const categoryNames = new Map(snapshot.categories.map((category) => [category.slug, category.name]));
    const authors = buildBreakdown(releases, authorNames, (release) => release.authors);
    const categories = buildBreakdown(releases, categoryNames, (release) => release.categories);

    const spanMonths = firstMonth !== null && latestMonth !== null ? latestMonth - firstMonth + 1 : 0;

    return {
        generatedAt: snapshot.generatedAt,
        totals: {
            articles: articles.length,
            podcasts: podcasts.length,
            total: releases.length,
            articleWords,
            avgWordsPerArticle: wordCounts.length > 0 ? Math.round(articleWords / wordCounts.length) : 0,
            podcastSeconds,
            avgPodcastSeconds: durations.length > 0 ? Math.round(podcastSeconds / durations.length) : 0,
            activeAuthors: authors.length,
            activeCategories: categories.length,
            firstReleaseDate: first?.date ?? null,
            latestReleaseDate: latest?.date ?? null,
            avgReleasesPerMonth: spanMonths > 0 ? round(releases.length / spanMonths, 1) : 0,
        },
        years,
        heatmap,
        cumulative,
        weekdays,
        wordBuckets: bucketize(wordCounts, WORD_BUCKETS),
        durationBuckets: bucketize(durations, DURATION_BUCKETS),
        longestArticles: topEntries(articles, (release) => release.wordCount),
        longestPodcasts: topEntries(podcasts, (release) => release.duration),
        categories,
        authors,
        records: buildRecords(releases, monthCounts, years),
    };
}

export type StatistikYearRun<T extends {year: number; total: number}> =
    | {kind: 'year'; item: T}
    | {kind: 'gap'; from: number; to: number};

/**
 * Collapses consecutive years without any release into a single "gap" entry so
 * long pauses do not blow up year-based charts with empty rows. Single empty
 * years are collapsed too (rendered as "2020" instead of "2020–2020").
 */
export function groupYearRuns<T extends {year: number; total: number}>(items: T[]): StatistikYearRun<T>[] {
    const runs: StatistikYearRun<T>[] = [];
    for (const item of items) {
        const previous = runs[runs.length - 1];
        if (item.total > 0) {
            runs.push({kind: 'year', item});
        } else if (previous?.kind === 'gap' && previous.to === item.year - 1) {
            previous.to = item.year;
        } else {
            runs.push({kind: 'gap', from: item.year, to: item.year});
        }
    }
    return runs;
}

export const HEATMAP_LEVELS = 4;

/** Maps a cell count to an intensity level 0…HEATMAP_LEVELS (0 = nothing released). */
export function heatmapLevel(value: number, max: number): number {
    if (value <= 0 || max <= 0) return 0;
    return Math.min(HEATMAP_LEVELS, Math.max(1, Math.ceil((value / max) * HEATMAP_LEVELS)));
}

/** Round axis ticks (0, step, 2·step, …) covering `max` with roughly `count` intervals. */
export function niceTicks(max: number, count = 4): number[] {
    if (max <= 0) return [0];
    const rough = max / count;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const step = ([1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= rough) ?? 10) * magnitude;
    const ticks: number[] = [];
    for (let value = 0; value < max + step; value += step) {
        ticks.push(value);
        if (value >= max) break;
    }
    return ticks;
}
