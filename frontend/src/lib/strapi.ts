export {getStrapiApiBaseUrl} from '@/src/lib/strapiTransport';

export {
    readApiPath,
    readCollection,
    readSingle,
    readStrapi,
    createPrivilegedFeedReader,
    type ContentReadOptions,
} from '@/src/lib/strapi/contentAccess';

export {
    fetchStrapiSingle,
    fetchStrapiCollection,
    type FetchStrapiOptions,
    type StrapiMeta,
    type StrapiSingleResponse,
    type StrapiCollectionResponse,
} from '@/src/lib/strapi/reads';

export {
    getImprint,
    getPrivacy,
    getAbout,
    getFeedsInfo,
    type StrapiLegalDoc,
    type StrapiAbout,
    type StrapiFeedsInfo,
} from '@/src/lib/strapi/singleTypes';
