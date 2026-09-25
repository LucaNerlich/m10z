import {type StatistikTotals} from '@/src/lib/statistik/types';
import {formatDecimal, formatHours, formatInteger, formatMinutes} from '@/src/lib/statistik/statistikFormat';

import styles from './StatistikStatsBar.module.css';

type StatistikStatsBarProps = {
    totals: StatistikTotals;
};

export function StatistikStatsBar({totals}: StatistikStatsBarProps) {
    const stats: {label: string; value: string; accent?: 'article' | 'podcast'}[] = [
        {label: 'Veröffentlichungen', value: formatInteger(totals.total)},
        {label: 'Artikel', value: formatInteger(totals.articles), accent: 'article'},
        {label: 'Podcast-Folgen', value: formatInteger(totals.podcasts), accent: 'podcast'},
        {label: 'Geschriebene Wörter', value: formatInteger(totals.articleWords), accent: 'article'},
        {label: 'Podcast-Laufzeit', value: formatHours(totals.podcastSeconds), accent: 'podcast'},
        {label: 'Ø Wörter pro Artikel', value: formatInteger(totals.avgWordsPerArticle)},
        {label: 'Ø Folgenlänge', value: formatMinutes(totals.avgPodcastSeconds)},
        {label: 'Ø pro Monat', value: formatDecimal(totals.avgReleasesPerMonth)},
        {label: 'Aktive AutorInnen', value: formatInteger(totals.activeAuthors)},
        {label: 'Kategorien', value: formatInteger(totals.activeCategories)},
    ];

    return (
        <dl className={styles.bar}>
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    className={styles.stat}
                    data-accent={stat.accent}>
                    <dt className={styles.label}>{stat.label}</dt>
                    <dd className={styles.value}>{stat.value}</dd>
                </div>
            ))}
        </dl>
    );
}
