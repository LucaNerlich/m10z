import {CrownSimpleIcon} from '@phosphor-icons/react/dist/ssr';

import {type GameHistory} from '@/src/lib/m12g/gameHistory';
import {formatMonthLong, formatVotes} from '@/src/lib/m12g/formatters';

import styles from './M12GGameDetail.module.css';

type M12GGameDetailProps = {
    game: GameHistory;
};

export function M12GGameDetail({game}: M12GGameDetailProps) {
    // Game-history appearances are chronological; show them newest-first.
    const timeline = [...game.appearances].reverse();
    const maxVotes = Math.max(1, ...timeline.map((t) => t.votes));

    return (
        <div className={styles.wrapper}>
            <header className={styles.header}>
                <h1 className={styles.title}>{game.name}</h1>
                <div className={styles.subline}>
                    <a href={game.link} target="_blank" rel="noreferrer noopener">
                        Store-Seite öffnen ↗
                    </a>
                </div>
            </header>

            <div className={styles.stats}>
                <div className={styles.stat}>
                    <span className={styles.statLabel}>Nominierungen</span>
                    <span className={styles.statValue}>{game.monthsNominated}</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statLabel}>Siege</span>
                    <span className={styles.statValue}>{game.wins}</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statLabel}>Stimmen gesamt</span>
                    <span className={styles.statValue}>{game.totalVotes}</span>
                </div>
            </div>

            <section className={styles.timelineWrapper}>
                <h2 className={styles.timelineHeading}>Auftritte</h2>
                <div className={styles.timeline}>
                    {timeline.map((entry) => (
                        <div key={entry.month} className={styles.row}>
                            <span className={styles.monthLabel}>
                                {entry.isWinner ? (
                                    <CrownSimpleIcon size={16} weight="fill" className={styles.crown}
                                                     aria-label="Sieger" />
                                ) : null}
                                {entry.forumThreadUrl ? (
                                    <a href={entry.forumThreadUrl} target="_blank" rel="noreferrer noopener">
                                        {formatMonthLong(entry.month)}
                                    </a>
                                ) : (
                                    formatMonthLong(entry.month)
                                )}
                            </span>
                            <meter className={styles.meter} min={0} max={maxVotes} value={entry.votes} />
                            <span className={styles.votes}>{formatVotes(entry.votes)}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
