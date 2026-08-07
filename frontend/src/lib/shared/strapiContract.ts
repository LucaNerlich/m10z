export type {
    ContentTypeConfig,
    ContentTypeKey,
    DocumentAction,
} from '@/src/lib/shared/contracts/strapi-contract/registry';

export {
    CONTENT_TYPE_KEYS,
    CONTENT_TYPES,
    contentTypeByUid,
    isContentTypeKey,
} from '@/src/lib/shared/contracts/strapi-contract/registry';

export type {InvalidationEvent} from '@/src/lib/shared/contracts/strapi-contract/invalidationEvent';
export {isDocumentAction} from '@/src/lib/shared/contracts/strapi-contract/invalidationEvent';

export type {ListableContentType} from '@/src/lib/shared/contracts/strapi-contract/tags';

export {
    ABOUT_PAGE_TAG,
    ABOUT_TAG,
    HOME_PAGE_TAG,
    IMPRINT_TAG,
    LEGAL_TAG,
    LEGAL_TAGS,
    PRIVACY_TAG,
    RELATED_CONTENT_TAG,
    SEARCH_INDEX_TAG,
    authorCategoryListPageTag,
    authorCategoryListTag,
    authorListPageTag,
    authorListTag,
    buildAuthorPageTags,
    bySlugsTag,
    entityTag,
    feedSourceTag,
    feedTag,
    listPageTag,
    listTag,
    sitemapTag,
    typeTag,
} from '@/src/lib/shared/contracts/strapi-contract/tags';
