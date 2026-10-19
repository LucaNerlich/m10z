import {type ReactNode} from 'react';

import styles from './Tag.module.css';

type TagProps = {
    children: ReactNode;
    className?: string;
    icon?: ReactNode;
};

export function Tag({children, className, icon}: TagProps) {
    const classes = [styles.tag, className].filter(Boolean).join(' ');

    return (
        <span className={classes}>
            {icon && <span className={styles.icon}>{icon}</span>}
            {children}
        </span>
    );
}
