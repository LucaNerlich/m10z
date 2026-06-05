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

export type StrapiArticleFeedSingle = {
    channel: {
        title: string;
        description: string;
        mail: string;
        image: StrapiMediaRef;
    };
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
    channel: {
        title: string;
        description: string;
        mail: string;
        image: StrapiMediaRef;
    };
    episodeFooter?: string | null;
};

export type {StrapiAuthor, StrapiCategoryRef, StrapiContentMedia, StrapiMedia, StrapiMediaRef, StrapiYoutube};
