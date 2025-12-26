import {type ReactNode} from 'react';

import styles from './Section.module.css';

type SectionProps = {
    children: ReactNode;
    title?: string;
    className?: string;
};

export function Section({children, title, className}: SectionProps) {
    const classes = [styles.section, className].filter(Boolean).join(' ');

    return (
        <section className={classes}>
            {title ? (
                <header className={styles.header}>
                    <h2 className={styles.title}>{title}</h2>
                </header>
            ) : null}
            {children}
        </section>
    );
}


