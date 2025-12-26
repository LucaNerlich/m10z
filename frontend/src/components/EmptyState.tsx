import styles from './EmptyState.module.css';

type EmptyStateProps = {
    message: string;
    className?: string;
};

export function EmptyState({message, className}: EmptyStateProps) {
    const classes = [styles.emptyState, className].filter(Boolean).join(' ');

    return <p className={classes}>{message}</p>;
}


