export {getStrapiApiBaseUrl} from '@/src/lib/strapiTransport';

export {
    readApiPath,
    readCollection,
    readSingle,
    readStrapi,
    createPrivilegedFeedReader,
    fetchJson,
    fetchJsonNoStore,
    fetchStrapiCollection,
    fetchStrapiSingle,
    type ContentReadOptions,
    type ContentFetchOptions,
    type FetchStrapiOptions,
    type StrapiMeta,
    type StrapiSingleResponse,
    type StrapiCollectionResponse,
} from '@/src/lib/strapi/contentAccess';

export {
    getImprint,
    getPrivacy,
    getAbout,
    getFeedsInfo,
    type StrapiLegalDoc,
    type StrapiAbout,
    type StrapiFeedsInfo,
} from '@/src/lib/strapi/singleTypes';
