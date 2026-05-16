import Link from 'next/link';

import {type StreaksResult} from '@/src/lib/m12g/gameHistory';
import {formatMonthCompact} from '@/src/lib/m12g/formatters';
import {routes} from '@/src/lib/routes';

import styles from './M12GStreaks.module.css';

type M12GStreaksProps = {
    streaks: StreaksResult;
};

export function M12GStreaks({streaks}: M12GStreaksProps) {
    return (
        <section className={styles.wrapper}>
            <StreakCard label='Längste Nominierungs-Serie' streak={streaks.nomination} />
            <StreakCard label='Längste Siegesserie' streak={streaks.win} />
        </section>
    );
}

type StreakCardProps = {
    label: string;
    streak: StreaksResult['nomination'];
};

function StreakCard({label, streak}: StreakCardProps) {
    return (
        <div className={styles.card}>
            <span className={styles.label}>{label}</span>
            {streak ? (
                <>
                    <span className={styles.value}>
                        <Link href={routes.m12gGame(streak.slug)}>{streak.name}</Link>
                        <span className={styles.length}>
                            {streak.length} Monate
                        </span>
                    </span>
                    <span className={styles.months}>
                        {streak.months.map(formatMonthCompact).join(' → ')}
                    </span>
                </>
            ) : (
                <span className={styles.empty}>Noch keine Serie über mehrere Monate.</span>
            )}
        </div>
    );
}
