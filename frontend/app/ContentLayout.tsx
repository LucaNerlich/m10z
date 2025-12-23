import React from 'react';

import styles from './ContentLayout.module.css';

type ContentLayoutProps = {
    children: React.ReactNode;
    className?: string;
};

export function ContentLayout({children, className}: ContentLayoutProps) {
    const cls = className ? `${styles.layout} ${className}` : styles.layout;
    return <div className={cls}>{children}</div>;
}

