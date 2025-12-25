import React from 'react';

import styles from './ContentLayout.module.css';

type ContentLayoutProps = {
    children: React.ReactNode;
    sidebar?: React.ReactNode;
    className?: string;
};

export function ContentLayout({children, sidebar, className}: ContentLayoutProps) {
    const cls = className ? `${styles.layout} ${className}` : styles.layout;
    const containerCls = sidebar ? `${styles.container} ${styles.withSidebar}` : styles.container;

    return (
        <div className={cls}>
            <div className={containerCls}>
                <div className={styles.content}>{children}</div>
                {sidebar ? <aside className={styles.sidebar}>{sidebar}</aside> : null}
            </div>
        </div>
    );
}

