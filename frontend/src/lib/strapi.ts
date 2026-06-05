export {getStrapiApiBaseUrl} from '@/src/lib/strapiTransport';

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
