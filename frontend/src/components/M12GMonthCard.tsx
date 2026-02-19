import styles from './M12GMonthCard.module.css';
import {type M12GMonthWithWinner} from '@/src/lib/m12g/types';
import {ChatsCircleIcon} from '@phosphor-icons/react/dist/ssr';

type M12GMonthCardProps = {
    month: M12GMonthWithWinner;
};

const germanDateFormatter = new Intl.DateTimeFormat('de-DE', {month: 'long', year: 'numeric'});
const germanPluralRules = new Intl.PluralRules('de-DE');

function formatMonthTitle(monthId: string): string {
    const parsed = new Date(`${monthId}-01T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return monthId;
    return germanDateFormatter.format(parsed);
}

function formatVotes(votes: number): string {
    const rule = germanPluralRules.select(votes);
    const unit = rule === 'one' ? 'Stimme' : 'Stimmen';
    return `${votes} ${unit}`;
}

export function M12GMonthCard({month}: M12GMonthCardProps) {
    return (
        <article className={styles.card}>
            <header className={styles.header}>
                <h2 className={styles.title}>
                    {formatMonthTitle(month.month)}
                    {month.title ? <span className={styles.subtitle}>"{month.title}"</span> : null}
                </h2>
            </header>

            {month.games.length === 0 ? (
                <p className={styles.emptyState}>Keine Spiele für diesen Monat.</p>
            ) : (
                <ul className={styles.gameList}>
                    {month.games.map((game) => {
                        const isWinner = month.winner === game;
                        const isTitleDefender = game.name === month.titleDefender;
                        return (
                            <li key={`${game.name}-${game.link}`}
                                className={isWinner ? styles.gameWinner : styles.gameItem}>
                                {isWinner ? <span className={styles.winnerLabel}>Sieger</span> : null}
                                <span className={styles.nameGroup}>
                                    <a
                                        className={styles.gameLink}
                                        href={game.link}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                    >
                                        {game.name}
                                    </a>
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
