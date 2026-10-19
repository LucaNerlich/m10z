import Link from 'next/link';
import styles from './Pagination.module.css';

type PaginationProps = {
    currentPage: number;
    totalPages: number;
    className?: string;
    previousHref?: string;
    nextHref?: string;
};

export function Pagination({
                               currentPage,
                               totalPages,
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
                {isFirstPage || !previousHref ? (
                    <span className={`${styles.pageButton} ${styles.pageButtonDisabled}`} aria-disabled="true">
                        Zurück
                    </span>
                ) : (
                    <Link className={styles.pageButton} href={previousHref}>
                        Zurück
                    </Link>
                )}
                {isLastPage || !nextHref ? (
                    <span className={`${styles.pageButton} ${styles.pageButtonDisabled}`} aria-disabled="true">
                        Weiter
                    </span>
                ) : (
                    <Link className={styles.pageButton} href={nextHref}>
                        Weiter
                    </Link>
                )}
            </div>
        </nav>
    );
}
