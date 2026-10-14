'use client';

import styles from './Button.module.css';

/**
 * The shared action button.
 *
 * Scope is deliberately narrow: it renders a `<button>` with the primary/secondary
 * variants and a loading state, and nothing else. Call sites that need a `ref`,
 * extra attributes, anchor/`<span>` parity, or their own visual treatment render
 * their own element instead - widening this API to absorb them (ref/data-*
 * passthrough, a local-class hook) would add surface for a single consumer, so the
 * local styles stay local. See Pagination (button + Link + span sharing one class)
 * and the search modal's close control (ref + data attribute + its own styling).
 */
type ButtonProps = {
    children: string;
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit';
};

export function Button({
    children,
    variant = 'primary',
    disabled = false,
    loading = false,
    onClick = () => {},
    type = 'button',
}: ButtonProps) {
    const classes = [
        styles.button,
        variant === 'secondary' ? styles.secondary : styles.primary,
        loading ? styles.loading : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button
            type={type}
            className={classes}
            disabled={disabled || loading}
            onClick={onClick}
            aria-busy={loading || undefined}
        >
            <span aria-live="polite" role="status">
                {loading ? 'Wird ausgeführt…' : children}
            </span>
        </button>
    );
}
