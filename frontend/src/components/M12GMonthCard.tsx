import styles from './M12GMonthCard.module.css';
import {type M12GMonthWithWinner} from '@/src/lib/m12g/types';
import {formatMonthLong, formatVotes} from '@/src/lib/m12g/formatters';
import {ChatsCircleIcon} from '@phosphor-icons/react/dist/ssr';

type M12GMonthCardProps = {
    month: M12GMonthWithWinner;
};

/**
 * The content of one game row. The winner group renders it inside a `<div>` and the
 * remaining games inside an `<li>`, so the wrapper stays with the caller and the row
 * markup (name, link, flags, votes) is defined once.
 */
function GameEntry({
                        game,
                        titleDefenders,
                    }: {
    game: M12GMonthWithWinner['games'][number];
    titleDefenders: string[];
}) {
    const isTitleDefender = titleDefenders.includes(game.name);

    return (
        <>
            <span className={styles.nameGroup}>
                <a
                    className={styles.gameLink}
                    href={game.link}
                    target="_blank"
                    rel="noreferrer noopener"
                >
                    {game.name}<span className='visually-hidden'> (öffnet in neuem Fenster)</span>
                </a>
                {game.earlyAccess ? (
                    <span className={styles.earlyAccess} title="Early Access">EA</span>
                ) : null}
                {isTitleDefender ? (
                    <span className={styles.titleDefender}>Titelträger</span>
                ) : null}
            </span>
            <span className={styles.voteCount}>{formatVotes(game.votes)}</span>
        </>
    );
}

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
                            {winners.map((game) => (
                                <div key={`${game.name}-${game.link}`} className={styles.winnerItem}>
                                    <GameEntry game={game} titleDefenders={month.titleDefenders} />
                                </div>
                            ))}
                        </li>
                    ) : null}
                    {nonWinners.map((game) => (
                        <li key={`${game.name}-${game.link}`} className={styles.gameItem}>
                            <GameEntry game={game} titleDefenders={month.titleDefenders} />
                        </li>
                    ))}
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
                        Forum-Thread<span className='visually-hidden'> (öffnet in neuem Fenster)</span>
                    </a>
                </footer>
            ) : null}
        </article>
    );
}
