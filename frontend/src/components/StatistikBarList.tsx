import Link from 'next/link';

import {formatInteger} from '@/src/lib/statistik/statistikFormat';

import {type StatistikTone} from './StatistikPanel';
import styles from './StatistikBarList.module.css';

export type StatistikBarListItem = {
    key: string;
    label: string;
    href?: string;
    /** When both are given the bar is split into primary/secondary segments. */
    primary?: number;
    secondary?: number;
    value: number;
    title?: string;
};

type StatistikBarListProps = {
    items: StatistikBarListItem[];
    /** Single-colour bars when the items are not split into segments. */
    tone?: StatistikTone;
    /** Highlights the item(s) with the highest value. */
    highlightMax?: boolean;
};

export function StatistikBarList({items, tone = 'primary', highlightMax = false}: StatistikBarListProps) {
    const max = Math.max(1, ...items.map((item) => item.value));

    return (
        <ul className={styles.list}>
            {items.map((item) => {
                const split = item.primary !== undefined && item.secondary !== undefined;
                return (
                    <li
                        key={item.key}
                        className={styles.item}
                        data-highlight={highlightMax && item.value === max ? '' : undefined}
                        title={item.title}>
                        {item.href ? (
                            <Link className={styles.label} href={item.href}>
                                {item.label}
                            </Link>
                        ) : (
                            <span className={styles.label}>{item.label}</span>
                        )}
                        <span className={styles.track} aria-hidden='true'>
                            {item.value > 0 ? (
                                <span className={styles.fill} style={{width: `${(item.value / max) * 100}%`}}>
                                    {split ? (
                                        <>
                                            <span className={styles.primary} style={{flexGrow: item.primary}} />
                                            <span className={styles.secondary} style={{flexGrow: item.secondary}} />
                                        </>
                                    ) : (
                                        <span className={styles[tone]} />
                                    )}
                                </span>
                            ) : null}
                        </span>
                        <span className={styles.value}>{formatInteger(item.value)}</span>
                        {item.title ? <span className='visually-hidden'>{item.title}</span> : null}
                    </li>
                );
            })}
        </ul>
    );
}
