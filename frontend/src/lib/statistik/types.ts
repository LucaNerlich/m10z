// Snapshot schema — the committed `public/statistik/snapshot.yaml` produced by
// `pnpm run snapshot:statistik`. It holds flat, raw facts only; every figure on the
// dashboard is derived from it in `statistikStats.ts`.

export const STATISTIK_SNAPSHOT_VERSION = 1;

export type StatistikPerson = {
    slug: string;
    name: string;
};

export type StatistikCategory = {
    slug: string;
    name: string;
};

export type StatistikArticle = {
    slug: string;
    title: string;
    /** Effective publication date (content `date`, falling back to `publishedAt`), ISO 8601. */
    date: string;
    wordCount: number | null;
    /** Author slugs. */
    authors: string[];
    /** Category slugs. */
    categories: string[];
};

export type StatistikPodcast = {
    slug: string;
    title: string;
    date: string;
    /** Episode length in seconds. */
    duration: number | null;
    authors: string[];
    categories: string[];
};

export type StatistikSnapshot = {
    version: number;
    generatedAt: string;
    authors: StatistikPerson[];
    categories: StatistikCategory[];
    articles: StatistikArticle[];
    podcasts: StatistikPodcast[];
};

// ---- Derived dashboard model ------------------------------------------------

export type StatistikCounts = {
    articles: number;
    podcasts: number;
    total: number;
};

export type StatistikTotals = StatistikCounts & {
    articleWords: number;
    avgWordsPerArticle: number;
    podcastSeconds: number;
    avgPodcastSeconds: number;
    activeAuthors: number;
    activeCategories: number;
    firstReleaseDate: string | null;
    latestReleaseDate: string | null;
    /** Average releases per calendar month between the first and the latest release. */
    avgReleasesPerMonth: number;
};

export type StatistikYear = StatistikCounts & {
    year: number;
    articleWords: number;
    podcastSeconds: number;
};

export type StatistikHeatmapCell = StatistikCounts & {
    /** `YYYY-MM` */
    month: string;
    /** False for months before the first release or after the snapshot date. */
    inRange: boolean;
};

export type StatistikHeatmapRow = {
    year: number;
    cells: StatistikHeatmapCell[];
    total: number;
};

export type StatistikHeatmap = {
    rows: StatistikHeatmapRow[];
    /** Totals per month of year (index 0 = January). */
    monthTotals: number[];
    maxCell: number;
};

export type StatistikCumulativePoint = StatistikCounts & {
    /** `YYYY-MM` */
    month: string;
};

export type StatistikBucket = {
    label: string;
    count: number;
};

export type StatistikBreakdownEntry = StatistikCounts & {
    slug: string;
    name: string;
};

export type StatistikTopEntry = {
    slug: string;
    title: string;
    date: string;
    value: number;
};

export type StatistikWeekday = StatistikCounts & {
    /** 0 = Monday … 6 = Sunday */
    weekday: number;
};

export type StatistikRecords = {
    busiestMonth: {month: string; total: number} | null;
    busiestYear: {year: number; total: number} | null;
    longestGap: {days: number; from: string; to: string} | null;
    longestMonthStreak: {months: number; from: string; to: string} | null;
};

export type StatistikDashboard = {
    generatedAt: string;
    totals: StatistikTotals;
    years: StatistikYear[];
    heatmap: StatistikHeatmap;
    cumulative: StatistikCumulativePoint[];
    weekdays: StatistikWeekday[];
    wordBuckets: StatistikBucket[];
    durationBuckets: StatistikBucket[];
    longestArticles: StatistikTopEntry[];
    longestPodcasts: StatistikTopEntry[];
    categories: StatistikBreakdownEntry[];
    authors: StatistikBreakdownEntry[];
    records: StatistikRecords;
};
