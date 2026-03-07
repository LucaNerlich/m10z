import {type M12GWinnerEntry} from '@/src/lib/m12g/types';
import {formatVotes, formatMonthLong} from '@/src/lib/m12g/formatters';

import styles from './M12GWinnerTimeline.module.css';

type M12GWinnerTimelineProps = {
    winners: M12GWinnerEntry[];
};

export function M12GWinnerTimeline({winners}: M12GWinnerTimelineProps) {
    if (winners.length === 0) return null;

    const reversed = [...winners].reverse();

    return (
        <section className={styles.wrapper}>
            <h2 className={styles.heading}>Hall of Fame</h2>
            <ul className={styles.timeline}>
                {reversed.map((entry) => (
                    <li key={entry.month} className={styles.entry}>
                        <span className={styles.month}>{formatMonthLong(entry.month)}</span>
                        <a
                            className={styles.gameName}
                            href={entry.gameLink}
                            target="_blank"
                            rel="noreferrer noopener"
                        >
                            {entry.gameName}
                        </a>
                        <span className={styles.votes}>{formatVotes(entry.votes)}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
