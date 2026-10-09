import {type UmamiTrafficStats} from '@/src/lib/analytics/umamiStats';
import {formatInteger, formatSnapshotDate} from '@/src/lib/statistik/statistikFormat';

import {StatistikPanel} from './StatistikPanel';
import {StatistikStatsBar, type StatistikStat} from './StatistikStatsBar';
import styles from './StatistikTrafficPanel.module.css';

type StatistikTrafficPanelProps = {
    traffic: UmamiTrafficStats;
};

/**
 * Live website reach (Umami) for `/statistik` — distinct from the editorial YAML snapshot.
 * Soft-fail callers omit this panel entirely when Umami is unavailable.
 */
export function StatistikTrafficPanel({traffic}: StatistikTrafficPanelProps) {
    const range = traffic.ranges['30d'];
    const stats: StatistikStat[] = [
        {key: 'visitors', label: 'Besucher', value: formatInteger(range.visitors), tone: 'primary'},
        {key: 'visits', label: 'Besuche', value: formatInteger(range.visits), tone: 'secondary'},
        {key: 'pageviews', label: 'Seitenaufrufe', value: formatInteger(range.pageviews), tone: 'primary'},
    ];

    return (
        <StatistikPanel
            title='Website-Reichweite'
            description={
                <>
                    Besucher der gesamten Website, letzte 30 Tage.
                </>
            }
            className={styles.panel}>
            <StatistikStatsBar stats={stats} />
            <p className={styles.meta}>
                Aktualisiert ca. alle 10 Minuten · Stand:{' '}
                <time dateTime={traffic.cachedAt}>{formatSnapshotDate(traffic.cachedAt)}</time>
            </p>
        </StatistikPanel>
    );
}
