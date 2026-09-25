import Link from 'next/link';
import {type ReactNode} from 'react';

import {type StatistikTone} from './StatistikPanel';
import styles from './StatistikTopList.module.css';

export type StatistikTopListItem = {
    key: string;
    title: string;
    href: string;
    /** Secondary line below the title, e.g. a date. */
    meta?: ReactNode;
    /** Optional external link (e.g. a store page) shown next to the title. */
    externalHref?: string;
    externalLabel?: string;
    value: string;
};

type StatistikTopListProps = {
    items: StatistikTopListItem[];
    tone?: StatistikTone;
    /** Renders an ordered list with rank circles; unranked lists only highlight the first item. */
    ranked?: boolean;
};

export function StatistikTopList({items, tone = 'primary', ranked = true}: StatistikTopListProps) {
    const List = ranked ? 'ol' : 'ul';

    return (
        <List className={styles.list} data-tone={tone} data-ranked={ranked ? '' : undefined}>
            {items.map((item, index) => (
                <li key={item.key} className={styles.item}>
                    {ranked ? (
                        <span className={styles.rank} aria-hidden='true'>
                            {index + 1}
                        </span>
                    ) : null}
                    <span className={styles.body}>
                        <span className={styles.titleRow}>
                            <Link className={styles.title} href={item.href}>
                                {item.title}
                            </Link>
                            {item.externalHref ? (
                                <a
                                    className={styles.external}
                                    href={item.externalHref}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    aria-label={item.externalLabel ?? `${item.title} extern öffnen`}>
                                    ↗
                                </a>
                            ) : null}
                        </span>
                        {item.meta ? <span className={styles.meta}>{item.meta}</span> : null}
                    </span>
                    <span className={styles.value}>{item.value}</span>
                </li>
            ))}
        </List>
    );
}
