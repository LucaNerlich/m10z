import styles from './loading.module.css';

export default function ArticleLoading() {
    return (
        <main className={styles.container} aria-label="Artikel wird geladen">
            <section className={styles.card}>
                <div className={styles.badge} />
                <div className={styles.title} />
                <div className={styles.meta}>
                    <span className={styles.metaItem} />
                    <span className={styles.metaItem} />
                </div>
                <div className={styles.body}>
                    {Array.from({length: 7}).map((_, idx) => (
                        <div key={idx} className={styles.line} />
                    ))}
                </div>
            </section>
        </main>
    );
}

