import Link from 'next/link';

import {type StreaksResult} from '@/src/lib/m12g/gameHistory';
import {routes} from '@/src/lib/routes';

import styles from './M12GStatsBar.module.css';

type M12GStatsBarProps = {
    totalMonths: number;
    totalUniqueGames: number;
    totalVotes: number;
    avgVotesPerMonth: number;
    winStreak: StreaksResult['win'];
};

export function M12GStatsBar({
    totalMonths,
    totalUniqueGames,
    totalVotes,
    avgVotesPerMonth,
    winStreak,
}: M12GStatsBarProps) {
    const items = [
        {value: totalMonths, label: 'Monate'},
        {value: totalUniqueGames, label: 'Spiele'},
        {value: totalVotes, label: 'Stimmen'},
        {value: avgVotesPerMonth, label: 'Stimmen / Monat'},
    ];

    return (
        <div className={styles.bar}>
            {items.map((item) => (
                <div key={item.label} className={styles.stat}>
                    <span className={styles.value}>{item.value}</span>
                    <span className={styles.label}>{item.label}</span>
                </div>
            ))}
            {winStreak ? (
                <div className={styles.stat}>
                    <span className={styles.value}>{winStreak.length}</span>
                    <span className={styles.label}>
                        Längste Siegesserie (
                        <Link className={styles.streakLink} href={routes.m12gGame(winStreak.slug)}>
                            {winStreak.name}
                        </Link>
                        )
                    </span>
                </div>
            ) : null}
        </div>
    );
}
