import styles from '../../loadingPlaceholder.module.css';

export default function TeamDetailLoading() {
    return (
        <main className={styles.container} aria-label="Team wird geladen">
            <div className={styles.stack}>
                <div className={styles.card}>
                    <div className={`${styles.bar} ${styles.short}`} />
                    <div className={styles.row}>
                        <span className={styles.pill} />
                        <span className={styles.pill} />
                    </div>
                    <div className={styles.bar} />
                    <div className={styles.bar} />
                    <div className={`${styles.bar} ${styles.short}`} />
                    <div className={`${styles.bar} ${styles.xshort}`} />
                </div>
            </div>
        </main>
    );
}

