import styles from './M12GMonthCard.module.css';
import {type M12GMonthWithWinner} from '@/src/lib/m12g/types';

type M12GMonthCardProps = {
    month: M12GMonthWithWinner;
};

function formatMonthTitle(monthId: string): string {
    const parsed = new Date(`${monthId}-01T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return monthId;
    return new Intl.DateTimeFormat('de-DE', {month: 'long', year: 'numeric'}).format(parsed);
}

function formatVotes(votes: number): string {
    return `${votes} ${votes === 1 ? 'Stimme' : 'Stimmen'}`;
}

export function M12GMonthCard({month}: M12GMonthCardProps) {
    return (
        <article className={styles.card}>
            <header className={styles.header}>
                <div>
                    <h2 className={styles.title}>{formatMonthTitle(month.month)}</h2>
                    {month.forumThreadUrl ? (
                        <a
                            className={styles.forumLink}
                            href={month.forumThreadUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                        >
                            Forum-Thread
                        </a>
                    ) : null}
                </div>
            </header>

            {month.games.length === 0 ? (
                <p className={styles.emptyState}>Keine Spiele für diesen Monat.</p>
            ) : (
                <ul className={styles.gameList}>
                    {month.games.map((game) => {
                        const isWinner = month.winner === game;
                        return (
                            <li key={`${game.name}-${game.link}`} className={isWinner ? styles.gameWinner : styles.gameItem}>
                                <a
                                    className={styles.gameLink}
                                    href={game.link}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                >
                                    {game.name}
                                </a>
                                <span className={styles.voteCount}>{formatVotes(game.votes)}</span>
                                {isWinner ? <span className={styles.winnerLabel}>Sieger</span> : null}
                            </li>
                        );
                    })}
                </ul>
            )}
        </article>
    );
}
