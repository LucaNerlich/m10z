import {type StatistikYear} from '@/src/lib/statistik/types';
import {formatHours, formatInteger, pluralize} from '@/src/lib/statistik/statistikFormat';
import {groupYearRuns} from '@/src/lib/statistik/statistikStats';

import {StatistikPanel} from './StatistikPanel';
import styles from './StatistikYearChart.module.css';

type StatistikYearChartProps = {
    years: StatistikYear[];
};

export function StatistikYearChart({years}: StatistikYearChartProps) {
    const runs = groupYearRuns(years);
    const max = Math.max(1, ...years.map((year) => year.total));

    return (
        <StatistikPanel title='Veröffentlichungen pro Jahr' legend>
            <ol className={styles.chart}>
                {runs.map((run) => {
                    if (run.kind === 'gap') {
                        return (
                            <li key={`gap-${run.from}`} className={`${styles.column} ${styles.gapColumn}`}>
                                <span className={styles.gapBar} aria-hidden='true' />
                                <span className={styles.year}>
                                    {run.from === run.to ? run.from : `${run.from}–${String(run.to).slice(2)}`}
                                </span>
                                <span className='visually-hidden'>: keine Veröffentlichungen</span>
                            </li>
                        );
                    }
                    const year = run.item;
                    const details = [
                        pluralize(year.articles, 'Artikel', 'Artikel'),
                        pluralize(year.podcasts, 'Podcast', 'Podcasts'),
                        `${formatInteger(year.articleWords)} Wörter`,
                        formatHours(year.podcastSeconds),
                    ].join(' · ');
                    return (
                        <li key={year.year} className={styles.column} title={`${year.year}: ${details}`}>
                            <span className={styles.value}>{formatInteger(year.total)}</span>
                            <span className={styles.track} aria-hidden='true'>
                                <span className={styles.stack} style={{height: `${(year.total / max) * 100}%`}}>
                                    <span className={styles.podcasts} style={{flexGrow: year.podcasts}} />
                                    <span className={styles.articles} style={{flexGrow: year.articles}} />
                                </span>
                            </span>
                            <span className={styles.year}>{year.year}</span>
                            <span className='visually-hidden'>: {details}</span>
                        </li>
                    );
                })}
            </ol>
        </StatistikPanel>
    );
}
