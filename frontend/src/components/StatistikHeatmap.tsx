import Link from 'next/link';

import {routes} from '@/src/lib/routes';
import {type StatistikHeatmap as StatistikHeatmapData} from '@/src/lib/statistik/types';
import {
    GERMAN_MONTHS,
    GERMAN_MONTHS_SHORT,
    formatInteger,
    formatMonthKey,
    pluralize,
} from '@/src/lib/statistik/statistikFormat';
import {HEATMAP_LEVELS, groupYearRuns, heatmapLevel} from '@/src/lib/statistik/statistikStats';

import {StatistikPanel} from './StatistikPanel';
import styles from './StatistikHeatmap.module.css';

type StatistikHeatmapProps = {
    heatmap: StatistikHeatmapData;
};

function describeCell(month: string, articles: number, podcasts: number): string {
    if (articles + podcasts === 0) return `${formatMonthKey(month)}: nichts veröffentlicht`;
    return `${formatMonthKey(month)}: ${pluralize(articles, 'Artikel', 'Artikel')}, ${pluralize(podcasts, 'Podcast', 'Podcasts')}`;
}

export function StatistikHeatmap({heatmap}: StatistikHeatmapProps) {
    const runs = groupYearRuns(heatmap.rows);
    const monthMax = Math.max(0, ...heatmap.monthTotals);

    return (
        <StatistikPanel
            title='Aktivität nach Monat'
            description='Jede Zelle ist ein Monat. Ein Klick zeigt alle Inhalte des Monats.'>
            <div className={styles.scroller}>
                <div
                    className={styles.grid}
                    role='table'
                    aria-label='Veröffentlichungen pro Monat und Jahr'>
                    <div className={styles.row} role='row'>
                        <span className={styles.corner} role='columnheader'>
                            <span className='visually-hidden'>Jahr</span>
                        </span>
                        {GERMAN_MONTHS_SHORT.map((month, index) => (
                            <span key={month} className={styles.monthLabel} role='columnheader'>
                                <abbr title={GERMAN_MONTHS[index]}>
                                    <span className={styles.monthLong}>{month}</span>
                                    <span className={styles.monthShort} aria-hidden='true'>
                                        {month.charAt(0)}
                                    </span>
                                </abbr>
                            </span>
                        ))}
                        <span className={styles.totalLabel} role='columnheader'>
                            Σ
                        </span>
                    </div>

                    {runs.map((run) =>
                        run.kind === 'gap' ? (
                            <div key={`gap-${run.from}`} className={styles.row} role='row'>
                                <span className={styles.yearLabel} role='rowheader'>
                                    {run.from === run.to ? run.from : `${run.from}–${String(run.to).slice(2)}`}
                                </span>
                                <span className={styles.gap} role='cell'>
                                    {run.from === run.to
                                        ? 'Ein Jahr ohne Veröffentlichung'
                                        : `${run.to - run.from + 1} Jahre Funkstille`}
                                </span>
                                <span className={styles.total} role='cell'>
                                    0
                                </span>
                            </div>
                        ) : (
                            <div key={run.item.year} className={styles.row} role='row'>
                                <span className={styles.yearLabel} role='rowheader'>
                                    {run.item.year}
                                </span>
                                {run.item.cells.map((cell) => {
                                    const label = cell.inRange
                                        ? describeCell(cell.month, cell.articles, cell.podcasts)
                                        : `${formatMonthKey(cell.month)}: außerhalb des Zeitraums`;
                                    const linked = cell.inRange && cell.total > 0;
                                    return (
                                        <span
                                            key={cell.month}
                                            className={styles.cell}
                                            data-level={cell.inRange ? heatmapLevel(cell.total, heatmap.maxCell) : undefined}
                                            data-out-of-range={cell.inRange ? undefined : ''}
                                            role='cell'
                                            title={label}
                                            aria-label={linked ? undefined : label}>
                                            {linked ? (
                                                <Link
                                                    href={routes.statistikMonth(cell.month)}
                                                    className={styles.cellLink}
                                                    aria-label={`${label} – alle anzeigen`}
                                                    prefetch={false}>
                                                    {cell.total}
                                                </Link>
                                            ) : null}
                                        </span>
                                    );
                                })}
                                <span className={styles.total} role='cell'>
                                    {formatInteger(run.item.total)}
                                </span>
                            </div>
                        )
                    )}

                    <div className={`${styles.row} ${styles.footerRow}`} role='row'>
                        <span className={styles.yearLabel} role='rowheader'>
                            Σ
                        </span>
                        {heatmap.monthTotals.map((total, index) => (
                            <span
                                key={GERMAN_MONTHS[index]}
                                className={styles.monthTotal}
                                role='cell'
                                title={`${GERMAN_MONTHS[index]}: ${formatInteger(total)} insgesamt`}>
                                <span
                                    className={styles.monthTotalBar}
                                    style={{height: `${monthMax > 0 ? (total / monthMax) * 100 : 0}%`}}
                                    aria-hidden='true'
                                />
                                <span className={styles.monthTotalValue}>{formatInteger(total)}</span>
                            </span>
                        ))}
                        <span className={styles.total} role='cell' />
                    </div>
                </div>
            </div>

            <div className={styles.scale} aria-hidden='true'>
                <span>weniger</span>
                {Array.from({length: HEATMAP_LEVELS + 1}, (_, level) => (
                    <span key={level} className={styles.scaleCell} data-level={level} />
                ))}
                <span>mehr</span>
                <span className={styles.scaleMax}>max. {formatInteger(heatmap.maxCell)} pro Monat</span>
            </div>
        </StatistikPanel>
    );
}
