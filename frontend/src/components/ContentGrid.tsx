import {type ReactNode} from 'react';
import styles from './ContentGrid.module.css';

type ContentGridProps = {
    children: ReactNode;
    gap?: 'compact' | 'comfortable' | 'spacious';
    mobileColumns?: number;
    className?: string;
};

/**
 * Responsive grid wrapper component for displaying content cards.
 *
 * Supports 3 columns at 960px+, 2 columns at 640-960px, and configurable columns below 640px.
 * Provides configurable gap spacing via props.
 */
export function ContentGrid({children, gap = 'comfortable', mobileColumns = 1, className}: ContentGridProps) {
    const classes = [
        styles.grid,
        styles[`gap${gap.charAt(0).toUpperCase() + gap.slice(1)}`],
        mobileColumns === 2 ? styles.mobileTwo : undefined,
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return <div className={classes}>{children}</div>;
}

