/**
 * Strapi populate and field presets.
 *
 * Centralised so that broadening or narrowing what's fetched for a given
 * concept (Article detail vs Article list vs Article related, etc.) is one
 * edit — not five.
 */

export const MEDIA_FIELDS = [
    'url',
    'width',
    'height',
    'blurhash',
    'alternativeText',
    'caption',
    'formats',
] as const;

const populateMedia = {fields: MEDIA_FIELDS};

const AUTHOR_FIELDS = ['title', 'slug', 'description'] as const;
export const populateAuthorAvatar = {
    populate: {avatar: populateMedia},
    fields: AUTHOR_FIELDS,
};

const populateCategoryForStats = {fields: ['slug', 'title'] as const};

const CATEGORY_CONTENT_FIELDS = ['title', 'description'] as const;
export const populateCategory = {
    populate: {
        cover: populateMedia,
        banner: populateMedia,
    },
    fields: [...CATEGORY_CONTENT_FIELDS, 'slug', 'date'] as unknown as [
        'title',
        'description',
        'slug',
        'date',
    ],
};

// ─── Article presets ────────────────────────────────────────────────────────

export const ARTICLE_LIST_FIELDS = [
    'slug',
    'wordCount',
    'publishedAt',
    'title',
    'description',
    'date',
] as const;

export const ARTICLE_DETAIL_FIELDS = [
    'slug',
    'content',
    'wordCount',
    'publishedAt',
    'title',
    'description',
    'date',
] as const;

/** Detail / by-slug / by-slugs population for Articles (incl. authors). */
export const articleDetailPopulate = {
    cover: populateMedia,
    banner: populateMedia,
    authors: populateAuthorAvatar,
    categories: populateCategory,
    youtube: true,
};

/** Paginated lists where authors are not needed. */
export const articleListPopulate = {
    cover: populateMedia,
    banner: populateMedia,
    categories: populateCategory,
    youtube: true,
};

/** Related-content sidebars: minimal population. */
export const articleRelatedPopulate = {
    cover: populateMedia,
    banner: populateMedia,
    categories: populateCategory,
};

// ─── Podcast presets ────────────────────────────────────────────────────────

export const PODCAST_LIST_FIELDS = [
    'slug',
    'duration',
    'wordCount',
    'publishedAt',
    'title',
    'description',
    'date',
] as const;

export const PODCAST_DETAIL_FIELDS = [
    'slug',
    'duration',
    'shownotes',
    'wordCount',
    'publishedAt',
    'title',
    'description',
    'date',
] as const;

const podcastYoutube = {fields: ['title', 'url'] as const};
const podcastFile = {populate: '*'} as const;

export const podcastDetailPopulate = {
    cover: populateMedia,
    banner: populateMedia,
    authors: populateAuthorAvatar,
    categories: populateCategory,
    youtube: podcastYoutube,
    file: podcastFile,
};

export const podcastListPopulate = {
    cover: populateMedia,
    banner: populateMedia,
    categories: populateCategory,
    youtube: podcastYoutube,
    file: podcastFile,
};

export const podcastRelatedPopulate = {
    cover: populateMedia,
    banner: populateMedia,
    categories: populateCategory,
    file: podcastFile,
};

// ─── Author presets ────────────────────────────────────────────────────────

export const AUTHOR_FIELDS_LIST = ['slug', 'title', 'description'] as const;

const authorContentRefFields = ['slug', 'publishedAt'] as const;

export const authorListPopulate = {
    avatar: true,
    articles: {fields: authorContentRefFields},
    podcasts: {fields: authorContentRefFields},
};

const authorDetailContentFields = ['slug', 'publishedAt', 'title', 'date'] as const;

export const authorBySlugPopulate = {
    avatar: true,
    articles: {
        populate: {categories: populateCategoryForStats},
        fields: authorDetailContentFields,
    },
    podcasts: {
        populate: {categories: populateCategoryForStats},
        fields: authorDetailContentFields,
    },
};

// ─── Category presets ──────────────────────────────────────────────────────

export const CATEGORY_FIELDS_LIST = ['slug', 'title', 'description', 'date'] as const;

const categoryContentRefFields = ['slug', 'publishedAt', 'title', 'date'] as const;

export const categoryWithContentPopulate = {
    cover: {fields: MEDIA_FIELDS},
    banner: {fields: MEDIA_FIELDS},
    articles: {fields: categoryContentRefFields},
    podcasts: {fields: categoryContentRefFields},
};
