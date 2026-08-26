import type {
    StrapiAuthor,
    StrapiCategoryRef,
    StrapiContentMedia,
    StrapiMedia,
    StrapiMediaRef,
    StrapiYoutube,
} from '@/src/lib/strapi/media';

export type StrapiArticle = StrapiContentMedia & {
    id: number;
    slug: string;
    publishedAt: string | null;
    categories?: StrapiCategoryRef[];
    authors?: StrapiAuthor[];
    youtube?: StrapiYoutube[];
    content: string;
    wordCount?: number | null;
};

/** Channel header shared by the article and audio feed single types. */
type FeedChannel = {
    title: string;
    description: string;
    mail: string;
    image: StrapiMediaRef;
};

export type StrapiArticleFeedSingle = {
    channel: FeedChannel;
};

export type StrapiPodcast = StrapiContentMedia & {
    id: number;
    slug: string;
    publishedAt: string | null;
    categories?: StrapiCategoryRef[];
    youtube?: StrapiYoutube[];
    shownotes?: string | null;
    duration: number;
    file: StrapiMediaRef;
    authors?: StrapiAuthor[];
    wordCount?: number | null;
};

export type StrapiAudioFeedSingle = {
    channel: FeedChannel;
    episodeFooter?: string | null;
};

