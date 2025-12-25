import {type ReactNode} from 'react';
import styles from './ContentGrid.module.css';

type ContentGridProps = {
    children: ReactNode;
    gap?: 'compact' | 'comfortable' | 'spacious';
    className?: string;
};

/**
 * Responsive grid wrapper component for displaying content cards.
 *
 * Supports 3 columns at 960px+, 2 columns at 640-960px, and 1 column below 640px.
 * Provides configurable gap spacing via props.
 */
export function ContentGrid({children, gap = 'comfortable', className}: ContentGridProps) {
    const classes = [styles.grid, styles[`gap${gap.charAt(0).toUpperCase() + gap.slice(1)}`], className]
        .filter(Boolean)
        .join(' ');

    return <div className={classes}>{children}</div>;
}

