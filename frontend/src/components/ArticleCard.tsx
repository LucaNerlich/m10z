import Image from 'next/image';
import Link from 'next/link';
import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {getOptimalMediaFormat, mediaUrlToAbsolute, pickBannerOrCoverMedia} from '@/src/lib/rss/media';
import {formatDateShort} from '@/src/lib/dateFormatters';
import {getLineClampCSS} from '@/src/lib/textUtils';
import {routes} from '@/src/lib/routes';
import styles from './ContentCard.module.css';
import placeholderCover from '@/public/images/m10z.jpg';
import {AuthorList} from './AuthorList';
import {CategoryList} from './CategoryList';
import {calculateReadingTime} from '@/src/lib/readingTime';

type ArticleCardProps = {
    article: StrapiArticle;
    showAuthors?: boolean;
    showCategories?: boolean;
    descriptionLines?: number;
    className?: string;
};

/**
 * Render a card preview for an article including cover image, meta, title, description, and optional authors/categories.
 *
 * Displays the article cover (or a placeholder), the effective publish date, an optional reading time computed from `article.wordCount`, the title linked to the article page, a line-clamped description, and optional author and category lists when enabled.
 *
 * @param article - The article data to render (StrapiArticle).
 * @param showAuthors - If true, render the article's authors list (defaults to `false`).
 * @param showCategories - If true, render the article's categories list (defaults to `false`).
 * @param descriptionLines - Number of lines to clamp the description to (defaults to `3`).
 * @param className - Additional CSS class names to append to the card element.
 * @returns The article card element ready for rendering in the UI.
 */
export function ArticleCard({
                                article,
                                showAuthors = false,
                                showCategories = false,
                                descriptionLines = 3,
                                className,
                            }: ArticleCardProps) {
    const bannerOrCoverMedia = pickBannerOrCoverMedia(article.base, article.categories);
    const optimizedMedia = bannerOrCoverMedia ? getOptimalMediaFormat(bannerOrCoverMedia, 'medium') : undefined;
    const imageUrl = optimizedMedia ? mediaUrlToAbsolute({media: optimizedMedia}) : null;
    const blurhash = optimizedMedia?.blurhash ?? null;
    const effectiveDate = getEffectiveDate(article);
    const formattedDate = formatDateShort(effectiveDate);
    const articleUrl = routes.article(article.slug);
    
    // Use wordCount for reading time calculation (no fallback to content)
    const readingTime = article.wordCount != null ? calculateReadingTime(article.wordCount) : null;

    const cardClasses = [styles.card, className].filter(Boolean).join(' ');

    return (
        <article className={cardClasses}>
            <div className={styles.media}>
                <Link href={articleUrl} className={styles.mediaLink} aria-label={`Artikelbild anzeigen: ${article.base.title}`}>
                    <Image
                        src={imageUrl ?? placeholderCover}
                        alt={article.base.title}
                        width={optimizedMedia?.width ?? 400}
                        height={optimizedMedia?.height ?? 225}
                        className={styles.cover}
                        placeholder={blurhash ? 'blur' : 'empty'}
                        blurDataURL={blurhash ?? undefined}
                    />
                </Link>
            </div>
            <div className={styles.cardBody}>
                <div className={styles.metaRow}>
                    <time className={styles.date} dateTime={effectiveDate ?? undefined}>
                        {formattedDate}
                    </time>
                    {readingTime ? (
                        <span className={styles.readingTime}>📖&nbsp;{readingTime}</span>
                    ) : null}
                </div>
                <h2 className={styles.cardTitle}>
                    <Link href={articleUrl} className={styles.cardLink}>
                        {article.base.title}
                    </Link>
                </h2>
                {article.base.description ? (
                    <p className={styles.description} style={getLineClampCSS(descriptionLines)}>
                        {article.base.description}
                    </p>
                ) : null}
                {showAuthors && article.authors && article.authors.length > 0 ? (
                    <AuthorList authors={article.authors} showAvatars={false} layout="inline" />
                ) : null}
                {showCategories && article.categories && article.categories.length > 0 ? (
                    <CategoryList categories={article.categories} />
                ) : null}
                <div className={styles.cardActions}>
                    <Link href={articleUrl} className={styles.readMore}>
                        Weiterlesen
                    </Link>
                </div>
            </div>
        </article>
    );
}
