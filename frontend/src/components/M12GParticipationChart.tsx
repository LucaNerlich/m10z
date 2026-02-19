import {type M12GMonthParticipation} from '@/src/lib/m12g/types';

import styles from './M12GParticipationChart.module.css';

type M12GParticipationChartProps = {
    months: M12GMonthParticipation[];
};

const germanShortDateFormatter = new Intl.DateTimeFormat('de-DE', {month: 'long', year: '2-digit'});

function formatMonth(monthId: string): string {
    const parsed = new Date(`${monthId}-01T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return monthId;
    return germanShortDateFormatter.format(parsed);
}

export function M12GParticipationChart({months}: M12GParticipationChartProps) {
    if (months.length === 0) return null;

    const maxVotes = Math.max(...months.map((m) => m.totalVotes), 1);

    return (
        <section className={styles.wrapper}>
            <h2 className={styles.heading}>Stimmen pro Monat</h2>
            <div className={styles.chart}>
                {months.map((month) => (
                    <div key={month.month} className={styles.row}>
                        <span className={styles.month}>{formatMonth(month.month)}</span>
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
