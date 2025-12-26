import Link from 'next/link';
import styles from './Pagination.module.css';

type PaginationProps = {
    currentPage: number;
    totalPages: number;
    onPrevious: () => void;
    onNext: () => void;
    className?: string;
    previousHref?: string;
    nextHref?: string;
};

export function Pagination({
    currentPage,
    totalPages,
    onPrevious,
    onNext,
    className,
    previousHref,
    nextHref,
}: PaginationProps) {
    const classes = [styles.pagination, className].filter(Boolean).join(' ');
    const isFirstPage = currentPage === 1;
    const isLastPage = currentPage >= totalPages;

    return (
        <nav className={classes} aria-label="Seiten">
            <div className={styles.pageInfo}>Seite {currentPage}</div>
            <div className={styles.pageControls}>
                {isFirstPage ? (
                    <span className={`${styles.pageButton} ${styles.pageButtonDisabled}`} aria-disabled>
                        Zurück
                    </span>
                ) : previousHref ? (
                    <Link className={styles.pageButton} href={previousHref} onClick={onPrevious}>
                        Zurück
                    </Link>
                ) : (
                    <button className={styles.pageButton} onClick={onPrevious}>
                        Zurück
                    </button>
                )}
                {isLastPage ? (
                    <span className={`${styles.pageButton} ${styles.pageButtonDisabled}`} aria-disabled>
                        Weiter
                    </span>
                ) : nextHref ? (
                    <Link className={styles.pageButton} href={nextHref} onClick={onNext}>
                        Weiter
                    </Link>
                ) : (
                    <button className={styles.pageButton} onClick={onNext}>
                        Weiter
                    </button>
                )}
            </div>
        </nav>
    );
}

