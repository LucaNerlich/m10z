import {type ReactNode} from 'react';

import styles from './Tag.module.css';

type TagProps = {
    children: ReactNode;
    className?: string;
    as?: 'span' | 'div';
};

export function Tag({children, className, as: Element = 'span'}: TagProps) {
    const classes = [styles.tag, className].filter(Boolean).join(' ');

    return <Element className={classes}>{children}</Element>;
}

