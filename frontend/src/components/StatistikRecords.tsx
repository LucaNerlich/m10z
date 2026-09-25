import {type ReactNode} from 'react';

import styles from './StatistikRecords.module.css';

export type StatistikRecordCard = {
    key: string;
    /** Decorative icon, e.g. a duotone Phosphor icon from `@phosphor-icons/react/dist/ssr`. */
    icon: ReactNode;
    label: string;
    value: ReactNode;
    detail?: ReactNode;
};

type StatistikRecordsProps = {
    cards: StatistikRecordCard[];
};

export function StatistikRecords({cards}: StatistikRecordsProps) {
    if (cards.length === 0) return null;

    return (
        <ul className={styles.grid}>
            {cards.map((card) => (
                <li key={card.key} className={styles.card}>
                    <span className={styles.icon} aria-hidden='true'>
                        {card.icon}
                    </span>
                    <span className={styles.label}>{card.label}</span>
                    <span className={styles.value}>{card.value}</span>
                    {card.detail ? <span className={styles.detail}>{card.detail}</span> : null}
                </li>
            ))}
        </ul>
    );
}
