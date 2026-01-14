import {type ReactNode} from 'react';

import styles from './Tag.module.css';

type TagProps = {
    children: ReactNode;
    className?: string;
    as?: 'span' | 'div';
    icon?: ReactNode;
};

export function Tag({children, className, as: Element = 'span', icon}: TagProps) {
    const classes = [styles.tag, className].filter(Boolean).join(' ');

    return (
        <Element className={classes}>
            {icon && <span className={styles.icon}>{icon}</span>}
            {children}
        </Element>
    );
}

