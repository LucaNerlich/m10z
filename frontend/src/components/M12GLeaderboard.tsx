import {type M12GLeaderboardEntry} from '@/src/lib/m12g/types';

import styles from './M12GLeaderboard.module.css';

type M12GLeaderboardProps = {
    entries: M12GLeaderboardEntry[];
};

function formatVotes(votes: number): string {
    const pluralRules = new Intl.PluralRules('de-DE');
    const rule = pluralRules.select(votes);
    const unit = rule === 'one' ? 'Stimme' : 'Stimmen';
    return `${votes} ${unit}`;
}

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
                        const barPercent = maxVotes > 0 ? (entry.totalVotes / maxVotes) * 100 : 0;
                        return (
                            <tr key={entry.name}>
                                <td className={styles.rank}>{index + 1}</td>
                                <td className={styles.nameCell}>
                                    <a
                                        className={styles.gameLink}
                                        href={entry.link}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                    >
                                        {entry.name}
                                    </a>
                                    {entry.monthsNominated > 1 ? (
                                        <span className={styles.monthsBadge}>
                                            {entry.monthsNominated}x nominiert
                                        </span>
                                    ) : null}
                                </td>
                                <td className={styles.barCell}>
                                    <div className={styles.barTrack}>
                                        <div
                                            className={styles.barFill}
                                            style={{width: `${barPercent}%`}}
                                        />
                                    </div>
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
