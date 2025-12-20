import styles from '../../src/styles/components/loadingPlaceholder.module.css';

export default function CategoryListLoading() {
    return (
        <main className={styles.container} aria-label="Kategorie werden geladen">
            <div className={styles.stack}>
                {[1, 2, 3].map((key) => (
                    <div key={key} className={styles.card}>
                        <div className={`${styles.bar} ${styles.short}`} />
                        <div className={styles.row}>
                            <span className={styles.pill} />
                            <span className={styles.pill} />
                        </div>
                        <div className={styles.bar} />
                        <div className={`${styles.bar} ${styles.short}`} />
                    </div>
                ))}
            </div>
        </main>
    );
}

