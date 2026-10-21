import React from 'react';

import styles from './ContentLayout.module.css';

type ContentLayoutProps = {
    children: React.ReactNode;
};

export function ContentLayout({children}: ContentLayoutProps) {
    return (
        <div className={styles.layout}>
            <div className={styles.container}>
                <div className={styles.content}>{children}</div>
            </div>
        </div>
    );
}

