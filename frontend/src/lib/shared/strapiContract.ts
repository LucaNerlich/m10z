export type {
    ContentTypeKey,
} from '@/src/lib/shared/contracts/strapi-contract/registry';

export {
    CONTENT_TYPE_KEYS,
    CONTENT_TYPES,
    isContentTypeKey,
} from '@/src/lib/shared/contracts/strapi-contract/registry';

export type {InvalidationEvent} from '@/src/lib/shared/contracts/strapi-contract/invalidationEvent';
export {isDocumentAction} from '@/src/lib/shared/contracts/strapi-contract/invalidationEvent';

export type {ListableContentType} from '@/src/lib/shared/contracts/strapi-contract/tags';

export {
    authorCategoryListTag,
    authorListTag,
    buildAuthorPageTags,
    entityTag,
    listTag,
    typeTag,
} from '@/src/lib/shared/contracts/strapi-contract/tags';
