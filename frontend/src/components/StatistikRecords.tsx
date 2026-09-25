import {CalendarCheckIcon, FireIcon, HourglassIcon, RocketLaunchIcon, TrophyIcon} from '@phosphor-icons/react/dist/ssr';
import {type ReactNode} from 'react';

import {type StatistikRecords as StatistikRecordsData, type StatistikTotals} from '@/src/lib/statistik/types';
import {formatCalendarDate, formatInteger, formatMonthKey, pluralize} from '@/src/lib/statistik/statistikFormat';

import styles from './StatistikRecords.module.css';

type StatistikRecordsProps = {
    records: StatistikRecordsData;
    totals: StatistikTotals;
};

type RecordCard = {
    key: string;
    icon: ReactNode;
    label: string;
    value: string;
    detail: string;
};

export function StatistikRecords({records, totals}: StatistikRecordsProps) {
    const cards: RecordCard[] = [];

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
                    <span className={styles.detail}>{card.detail}</span>
                </li>
            ))}
        </ul>
    );
}
