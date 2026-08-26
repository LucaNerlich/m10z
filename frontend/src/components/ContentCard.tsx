import Image from 'next/image';
import Link from 'next/link';
import {type ReactNode} from 'react';

import {pickAndOptimizeImage, type StrapiAuthor, type StrapiCategoryRef, type StrapiMediaRef} from '@/src/lib/strapi/media';
import {formatDateShort} from '@/src/lib/dateFormatters';
import {getLineClampCSS} from '@/src/lib/textUtils';
import styles from './ContentCard.module.css';
import placeholderCover from '@/public/images/m10z.jpg';
import {AuthorList} from './AuthorList';
import {CategoryList} from './CategoryList';

type ContentCardProps = {
    title: string;
    description?: string | null;
    /** Effective date (ISO string) shown in the card meta row. */
    date?: string | null;
    cover?: StrapiMediaRef | null;
    banner?: StrapiMediaRef | null;
    categories?: StrapiCategoryRef[] | null;
    authors?: StrapiAuthor[] | null;
    href: string;
    /** Prefix for the media link aria-label, e.g. "Artikelbild" → "Artikelbild anzeigen: …". */
    mediaAltPrefix: string;
    /** Label of the trailing call-to-action link, e.g. "Weiterlesen". */
    ctaLabel: string;
    /** Optional meta chip rendered after the date (reading time, duration, …). */
    meta?: ReactNode;
    showAuthors?: boolean;
    showCategories?: boolean;
    descriptionLines?: number;
    className?: string;
};

/**
 * Shared card layout for article and podcast previews: cover image (with
 * blurhash placeholder), date + optional meta chip, title, line-clamped
 * description, optional author/category lists, and a call-to-action link.
 *
 * `ArticleCard` and `PodcastCard` map their content type onto this component.
 */
export function ContentCard({
                                title,
                                description,
                                date,
                                cover,
                                banner,
                                categories,
                                authors,
                                href,
                                mediaAltPrefix,
                                ctaLabel,
                                meta,
                                showAuthors = false,
                                showCategories = false,
                                descriptionLines = 3,
                                className,
                            }: ContentCardProps) {
    const {media: optimizedMedia, url: imageUrl} = pickAndOptimizeImage(
        {title, cover, banner},
        categories ?? undefined,
        'medium',
    );
    const blurhash = optimizedMedia?.blurhash ?? null;
    const formattedDate = formatDateShort(date);
    const effectiveDescription = description || categories?.[0]?.description;

    const cardClasses = [styles.card, className].filter(Boolean).join(' ');

    return (
        <article className={cardClasses}>
            <div className={styles.media}>
                <Link href={href} className={styles.mediaLink}
                      aria-label={`${mediaAltPrefix} anzeigen: ${title}`}>
                    <Image
                        src={imageUrl ?? placeholderCover}
                        alt={title}
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
                    <time className={styles.date} dateTime={date ?? undefined}>
                        {formattedDate}
                    </time>
                    {meta ?? null}
                </div>
                <h2 className={styles.cardTitle}>
                    <Link href={href} className={styles.cardLink}>
                        {title}
                    </Link>
                </h2>
                {effectiveDescription ? (
                    <p className={styles.description} style={getLineClampCSS(descriptionLines)}>
                        {effectiveDescription}
                    </p>
                ) : null}
                {showAuthors && authors && authors.length > 0 ? (
                    <AuthorList authors={authors} showAvatars={false} layout="inline" />
                ) : null}
                {showCategories && categories && categories.length > 0 ? (
                    <CategoryList categories={categories} />
                ) : null}
                <div className={styles.cardActions}>
                    <Link href={href} className={styles.readMore}>
                        {ctaLabel}
                    </Link>
                </div>
            </div>
        </article>
    );
}
