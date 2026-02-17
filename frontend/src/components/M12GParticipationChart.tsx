import {type M12GMonthParticipation} from '@/src/lib/m12g/types';

import styles from './M12GParticipationChart.module.css';

type M12GParticipationChartProps = {
    months: M12GMonthParticipation[];
};

function formatMonth(monthId: string): string {
    const parsed = new Date(`${monthId}-01T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return monthId;
    return new Intl.DateTimeFormat('de-DE', {month: 'long', year: '2-digit'}).format(parsed);
}

export function M12GParticipationChart({months}: M12GParticipationChartProps) {
    if (months.length === 0) return null;

    const maxVotes = Math.max(...months.map((m) => m.totalVotes), 1);

    return (
        <section className={styles.wrapper}>
            <h2 className={styles.heading}>Stimmen pro Monat</h2>
            <div className={styles.chart}>
                {months.map((month) => {
                    const barPercent = (month.totalVotes / maxVotes) * 100;
                    return (
                        <div key={month.month} className={styles.row}>
                            <span className={styles.month}>{formatMonth(month.month)}</span>
                            <div className={styles.barTrack}>
                                <div
                                    className={styles.barFill}
                                    style={{width: `${barPercent}%`}}
                                />
                            </div>
                            <span className={styles.value}>{month.totalVotes}</span>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
