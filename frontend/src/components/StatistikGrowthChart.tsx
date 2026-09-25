import {type StatistikCumulativePoint} from '@/src/lib/statistik/types';
import {formatInteger, formatMonthKey} from '@/src/lib/statistik/statistikFormat';
import {niceTicks} from '@/src/lib/statistik/statistikStats';

import {StatistikPanel} from './StatistikPanel';
import styles from './StatistikGrowthChart.module.css';

type StatistikGrowthChartProps = {
    points: StatistikCumulativePoint[];
};

const WIDTH = 1000;
const HEIGHT = 300;
const MIN_LABEL_DISTANCE = 7;

function toPolyline(values: number[], max: number): string {
    const lastIndex = Math.max(1, values.length - 1);
    return values
        .map((value, index) => `${((index / lastIndex) * WIDTH).toFixed(1)},${(HEIGHT - (value / max) * HEIGHT).toFixed(1)}`)
        .join(' L');
}

export function StatistikGrowthChart({points}: StatistikGrowthChartProps) {
    if (points.length < 2) return null;

    const first = points[0];
    const last = points[points.length - 1];
    const ticks = niceTicks(last.total);
    const max = ticks[ticks.length - 1] || 1;
    const lastIndex = points.length - 1;

    const articleLine = toPolyline(
        points.map((point) => point.articles),
        max
    );
    const totalLine = toPolyline(
        points.map((point) => point.total),
        max
    );

    const yearLabels: {year: string; left: number}[] = [];
    points.forEach((point, index) => {
        if (!point.month.endsWith('-01')) return;
        const left = (index / lastIndex) * 100;
        const previous = yearLabels[yearLabels.length - 1];
        if (left > 100 - MIN_LABEL_DISTANCE / 2) return;
        if (previous && left - previous.left < MIN_LABEL_DISTANCE) return;
        yearLabels.push({year: point.month.slice(0, 4), left});
    });

    return (
        <StatistikPanel
            title='Gesamtentwicklung'
            description={`Kumulierte Veröffentlichungen von ${formatMonthKey(first.month)} bis ${formatMonthKey(last.month)}.`}
            legend>
            <figure className={styles.figure}>
                <div className={styles.plot}>
                    {ticks.map((tick) => (
                        <span
                            key={tick}
                            className={styles.tick}
                            style={{bottom: `${(tick / max) * 100}%`}}
                            aria-hidden='true'>
                            <span className={styles.tickLabel}>{formatInteger(tick)}</span>
                        </span>
                    ))}
                    <svg
                        className={styles.svg}
                        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                        preserveAspectRatio='none'
                        aria-hidden='true'
                        focusable='false'>
                        <path className={styles.totalArea} d={`M0,${HEIGHT} L${totalLine} L${WIDTH},${HEIGHT} Z`} />
                        <path className={styles.articleArea} d={`M0,${HEIGHT} L${articleLine} L${WIDTH},${HEIGHT} Z`} />
                        <path className={styles.totalLine} d={`M${totalLine}`} vectorEffect='non-scaling-stroke' />
                        <path className={styles.articleLine} d={`M${articleLine}`} vectorEffect='non-scaling-stroke' />
                    </svg>
                    <span
                        className={styles.endBadge}
                        style={{bottom: `${(last.total / max) * 100}%`}}>
                        {formatInteger(last.total)}
                    </span>
                </div>
                <div className={styles.xAxis} aria-hidden='true'>
                    {yearLabels.map((label) => (
                        <span key={label.year} className={styles.xLabel} style={{left: `${label.left}%`}}>
                            {label.year}
                        </span>
                    ))}
                </div>
                <figcaption className='visually-hidden'>
                    {`Bis ${formatMonthKey(last.month)} erschienen insgesamt ${formatInteger(last.total)} Beiträge: ${formatInteger(last.articles)} Artikel und ${formatInteger(last.podcasts)} Podcasts.`}
                </figcaption>
            </figure>
        </StatistikPanel>
    );
}
