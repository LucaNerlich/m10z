import {type ReactNode} from 'react';

import {type StatistikTone} from './StatistikPanel';
import styles from './StatistikStatsBar.module.css';

export type StatistikStat = {
    key: string;
    label: ReactNode;
    value: string;
    /** Adds a coloured accent stripe. */
    tone?: StatistikTone;
};

type StatistikStatsBarProps = {
    stats: StatistikStat[];
};

export function StatistikStatsBar({stats}: StatistikStatsBarProps) {
    return (
        <dl className={styles.bar}>
            {stats.map((stat) => (
                <div key={stat.key} className={styles.stat} data-tone={stat.tone}>
                    <dt className={styles.label}>{stat.label}</dt>
                    <dd className={styles.value}>{stat.value}</dd>
                </div>
            ))}
        </dl>
    );
}
