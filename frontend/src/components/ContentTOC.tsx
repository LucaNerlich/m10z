import styles from '@/src/components/ContentTOC.module.css';
import {type Headline} from '@/src/lib/extractHeadlines';

type ContentTOCProps = {
    headlines: Headline[];
};

export function ContentTOC({headlines}: ContentTOCProps) {
    if (!headlines.length) return null;

    return (
        <aside className={styles.toc} aria-label="Inhaltsverzeichnis">
            <h2 className={styles.title}>Inhaltsverzeichnis</h2>
            <ol className={styles.list}>
                {headlines.map((headline) => (
                    <li key={`${headline.slug}-${headline.level}`} className={styles[`level${headline.level}`]}>
                        <a className={styles.link} href={`#${headline.slug}`}>
                            {headline.text}
                        </a>
                    </li>
                ))}
            </ol>
        </aside>
    );
}
