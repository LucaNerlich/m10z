import {type ReactNode} from 'react';

import styles from './StatistikDashboard.module.css';

type StatistikIntroProps = {
    title: string;
    lead?: ReactNode;
    meta?: ReactNode;
};

export function StatistikIntro({title, lead, meta}: StatistikIntroProps) {
    return (
        <header className={styles.intro}>
            <h1>{title}</h1>
            {lead ? <p className={styles.lead}>{lead}</p> : null}
            {meta ? <p className={styles.meta}>{meta}</p> : null}
        </header>
    );
}

type StatistikDashboardProps = {
    children: ReactNode;
};

/** Grid wrapper that also defines the `--statistik-*` colour tokens used by all Statistik components. */
export function StatistikDashboard({children}: StatistikDashboardProps) {
    return <div className={styles.dashboard}>{children}</div>;
}

type StatistikColumnsProps = {
    /** Narrower minimum column width, fits three panels side by side. */
    narrow?: boolean;
    children: ReactNode;
};

export function StatistikColumns({narrow = false, children}: StatistikColumnsProps) {
    return <div className={narrow ? `${styles.columns} ${styles.narrow}` : styles.columns}>{children}</div>;
}
