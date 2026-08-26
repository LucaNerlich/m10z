import {type CSSProperties} from 'react';

/**
 * CSS line-clamp utility functions for text truncation.
 *
 * Provides helpers for implementing multi-line text truncation using CSS
 * line-clamp properties with browser compatibility support.
 */

/**
 * Returns a CSS object with line-clamp properties for use with inline styles.
 *
 * @param lines - Number of lines to clamp (1-10)
 * @returns CSS object with line-clamp properties
 */
export function getLineClampCSS(lines: number): CSSProperties {
    const clampedLines = Math.max(1, Math.min(10, Math.floor(lines)));
    return {
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: clampedLines,
        lineClamp: clampedLines,
        overflow: 'hidden',
    };
}

