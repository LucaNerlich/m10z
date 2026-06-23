import Link from 'next/link';

import {type M12GLeaderboardEntry} from '@/src/lib/m12g/types';
import {formatVotes} from '@/src/lib/m12g/formatters';
import {routes} from '@/src/lib/routes';

import styles from './M12GLeaderboard.module.css';

type M12GLeaderboardProps = {
    entries: M12GLeaderboardEntry[];
};

export function M12GLeaderboard({entries}: M12GLeaderboardProps) {
    if (entries.length === 0) return null;

    const maxVotes = entries[0]?.totalVotes ?? 1;

    return (
        <section className={styles.wrapper}>
            <h2 className={styles.heading}>All-Time Leaderboard</h2>
            <table className={styles.table}>
                <thead>
                <tr>
                    <th>#</th>
                    <th>Spiel</th>
                    <th aria-label="Stimmen-Balken">{''}</th>
                    <th>Stimmen</th>
                </tr>
                </thead>
                <tbody>
                {entries.map((entry, index) => {
                    return (
                        <tr key={entry.name}>
                            <td className={styles.rank}>{index + 1}</td>
                            <td className={styles.nameCell}>
                                <Link
                                    className={styles.gameLink}
                                    href={routes.m12gGame(entry.slug)}
                                >
                                    {entry.name}
                                </Link>
                                <a
                                    className={styles.externalLink}
                                    href={entry.link}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    aria-label={`${entry.name} im Store öffnen`}
                                >
                                    ↗
                                </a>
                                {entry.monthsNominated > 1 ? (
                                    <span className={styles.monthsBadge}>
                                            {entry.monthsNominated}x nominiert
                                        </span>
                                ) : null}
                            </td>
                            <td className={styles.barCell}>
                                <meter
                                    className={styles.meter}
                                    min={0}
                                    max={maxVotes}
                                    value={entry.totalVotes}
                                />
                            </td>
                            <td className={styles.votesCell}>{formatVotes(entry.totalVotes)}</td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
        </section>
    );
}
