import {type M12GMonthParticipation} from '@/src/lib/m12g/types';
import {formatMonthShort} from '@/src/lib/m12g/formatters';

import styles from './M12GParticipationChart.module.css';

type M12GParticipationChartProps = {
    months: M12GMonthParticipation[];
};

export function M12GParticipationChart({months}: M12GParticipationChartProps) {
    if (months.length === 0) return null;

    const maxVotes = Math.max(...months.map((m) => m.totalVotes), 1);
    const newestFirst = [...months].reverse();

    return (
        <section className={styles.wrapper}>
            <h2 className={styles.heading}>Stimmen pro Monat</h2>
            <div className={styles.chart}>
                {newestFirst.map((month) => (
                    <div key={month.month} className={styles.row}>
                        <span className={styles.month}>{formatMonthShort(month.month)}</span>
                        <meter
                            className={styles.meter}
                            min={0}
                            max={maxVotes}
                            value={month.totalVotes}
                        />
                        <span className={styles.value}>{month.totalVotes}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}
