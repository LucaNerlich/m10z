import {type StrapiArticle} from '@/src/lib/strapi/contentTypes';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {routes} from '@/src/lib/routes';
import {calculateReadingTimeCompact} from '@/src/lib/readingTime';
import {BookIcon} from '@phosphor-icons/react/dist/ssr';

import {ContentCard} from './ContentCard';
import cardStyles from './ContentCard.module.css';

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
 * Article-specific bits (reading time chip, "Weiterlesen" CTA) are mapped onto the shared `ContentCard` layout.
 */
export function ArticleCard({
                                article,
                                showAuthors = false,
                                showCategories = false,
                                descriptionLines = 3,
                                className,
                            }: ArticleCardProps) {
    // Use wordCount for reading time calculation (no fallback to content)
    const readingTime = article.wordCount != null ? calculateReadingTimeCompact(article.wordCount) : null;

    return (
        <ContentCard
            title={article.title}
            description={article.description}
            date={getEffectiveDate(article)}
            cover={article.cover}
            banner={article.banner}
            categories={article.categories}
            authors={article.authors}
            href={routes.article(article.slug)}
            mediaAltPrefix="Artikelbild"
            ctaLabel="Weiterlesen"
            meta={readingTime ? (
                <span className={cardStyles.readingTime}>
                    <BookIcon size={14} aria-hidden='true' />
                    &nbsp;{readingTime}
                </span>
            ) : null}
            showAuthors={showAuthors}
            showCategories={showCategories}
            descriptionLines={descriptionLines}
            className={className}
        />
    );
}
