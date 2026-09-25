import Link from 'next/link';

import {type StatistikTopEntry} from '@/src/lib/statistik/types';
import {formatCalendarDate} from '@/src/lib/statistik/statistikFormat';

import styles from './StatistikTopList.module.css';

type StatistikTopListProps = {
    entries: StatistikTopEntry[];
    href: (slug: string) => string;
    formatValue: (value: number) => string;
    tone: 'article' | 'podcast';
};

export function StatistikTopList({entries, href, formatValue, tone}: StatistikTopListProps) {
    return (
        <ol className={styles.list} data-tone={tone}>
            {entries.map((entry, index) => (
                <li key={entry.slug} className={styles.item}>
                    <span className={styles.rank} aria-hidden='true'>
                        {index + 1}
                    </span>
                    <span className={styles.body}>
                        <Link className={styles.title} href={href(entry.slug)}>
                            {entry.title}
                        </Link>
                        <time className={styles.date} dateTime={entry.date}>
                            {formatCalendarDate(entry.date)}
                        </time>
                    </span>
                    <span className={styles.value}>{formatValue(entry.value)}</span>
                </li>
            ))}
        </ol>
    );
}
