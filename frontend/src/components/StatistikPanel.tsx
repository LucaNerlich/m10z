import {type ReactNode} from 'react';

import styles from './StatistikPanel.module.css';

type StatistikPanelProps = {
    title: string;
    description?: string;
    legend?: boolean;
    className?: string;
    children: ReactNode;
};

export function StatistikPanel({title, description, legend = false, className, children}: StatistikPanelProps) {
    return (
        <section className={className ? `${styles.panel} ${className}` : styles.panel}>
            <header className={styles.header}>
                <div>
                    <h2 className={styles.title}>{title}</h2>
                    {description ? <p className={styles.description}>{description}</p> : null}
                </div>
                {legend ? <StatistikLegend /> : null}
            </header>
            {children}
        </section>
    );
}

export function StatistikLegend() {
    return (
        <ul className={styles.legend}>
            <li>
                <span className={`${styles.swatch} ${styles.swatchArticle}`} aria-hidden='true' />
                Artikel
            </li>
            <li>
                <span className={`${styles.swatch} ${styles.swatchPodcast}`} aria-hidden='true' />
                Podcasts
            </li>
        </ul>
    );
}
