import {type ReactNode} from 'react';

import styles from './Card.module.css';

type CardProps = {
    children: ReactNode;
    className?: string;
    variant?: 'default' | 'empty';
    id?: string;
};

export function Card({children, className, variant = 'default', id}: CardProps) {
    const classes = [
        styles.card,
        variant === 'empty' && styles.empty,
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return <article id={id} className={classes}>{children}</article>;
}

