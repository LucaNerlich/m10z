import styles from './M12GStatsBar.module.css';

type M12GStatsBarProps = {
    totalMonths: number;
    totalUniqueGames: number;
    totalVotes: number;
    avgVotesPerMonth: number;
};

export function M12GStatsBar({totalMonths, totalUniqueGames, totalVotes, avgVotesPerMonth}: M12GStatsBarProps) {
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
        </div>
    );
}
