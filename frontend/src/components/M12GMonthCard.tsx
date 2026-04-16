import styles from './M12GMonthCard.module.css';
import {type M12GMonthWithWinner} from '@/src/lib/m12g/types';
import {formatVotes, formatMonthLong} from '@/src/lib/m12g/formatters';
import {ChatsCircleIcon} from '@phosphor-icons/react/dist/ssr';

type M12GMonthCardProps = {
    month: M12GMonthWithWinner;
};

export function M12GMonthCard({month}: M12GMonthCardProps) {
    const {winners} = month;
    const winnerNames = new Set(winners.map((w) => w.name));
    const nonWinners = month.games.filter((game) => !winnerNames.has(game.name));

    return (
        <article className={styles.card}>
            <header className={styles.header}>
                <h2 className={styles.title}>
                    {formatMonthLong(month.month)}
                    {month.title ? <span className={styles.subtitle}>"{month.title}"</span> : null}
                </h2>
            </header>

            {month.games.length === 0 ? (
                <p className={styles.emptyState}>Keine Spiele für diesen Monat.</p>
            ) : (
                <ul className={styles.gameList}>
                    {winners.length > 0 ? (
                        <li className={styles.winnerGroup}>
                            <span className={styles.winnerLabel}>Sieger</span>
                            {winners.map((game) => {
                                const isTitleDefender = month.titleDefenders.includes(game.name);
                                return (
                                    <div key={`${game.name}-${game.link}`}
                                        className={styles.winnerItem}>
                                        <span className={styles.nameGroup}>
                                            <a
                                                className={styles.gameLink}
                                                href={game.link}
                                                target="_blank"
                                                rel="noreferrer noopener"
                                            >
                                                {game.name}
                                            </a>
                                            {game.earlyAccess ? (
                                                <span className={styles.earlyAccess} title="Early Access">EA</span>
                                            ) : null}
                                            {isTitleDefender ? (
                                                <span className={styles.titleDefender}>Titelträger</span>
                                            ) : null}
                                        </span>
                                        <span className={styles.voteCount}>{formatVotes(game.votes)}</span>
                                    </div>
                                );
                            })}
                        </li>
                    ) : null}
                    {nonWinners.map((game) => {
                        const isTitleDefender = month.titleDefenders.includes(game.name);
                        return (
                            <li key={`${game.name}-${game.link}`}
                                className={styles.gameItem}>
                                <span className={styles.nameGroup}>
                                    <a
                                        className={styles.gameLink}
                                        href={game.link}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                    >
                                        {game.name}
                                    </a>
                                    {game.earlyAccess ? (
                                        <span className={styles.earlyAccess} title="Early Access">EA</span>
                                    ) : null}
                                    {isTitleDefender ? (
                                        <span className={styles.titleDefender}>Titelträger</span>
                                    ) : null}
                                </span>
                                <span className={styles.voteCount}>{formatVotes(game.votes)}</span>
                            </li>
                        );
                    })}
                </ul>
            )}

            {month.forumThreadUrl ? (
                <footer className={styles.footer}>
                    <a
                        className={styles.forumLink}
                        href={month.forumThreadUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                    >
                        <ChatsCircleIcon size={18} weight="regular" />
                        Forum-Thread
                    </a>
                </footer>
            ) : null}
        </article>
    );
}
