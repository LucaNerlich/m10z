'use client';

import styles from './Button.module.css';

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
