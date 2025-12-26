/**
 * TypeScript interfaces for schema.org JSON-LD structured data types.
 * Based on schema.org vocabulary: https://schema.org/
 */

export interface JsonLdBase {
    '@context': string;
    '@type': string;
}

export interface ImageObject extends JsonLdBase {
    '@type': 'ImageObject';
    url: string;
    width?: number;
    height?: number;
}

export interface Person extends JsonLdBase {
    '@type': 'Person';
    name: string;
    url?: string;
    image?: ImageObject | string;
}

export interface Organization extends JsonLdBase {
    '@type': 'Organization';
    name: string;
    alternateName?: string;
    url: string;
    logo?: ImageObject | string;
    sameAs?: string[];
}

export interface AudioObject extends JsonLdBase {
    '@type': 'AudioObject';
    contentUrl: string;
    encodingFormat: string;
    duration: string;
}

export interface PodcastSeries extends JsonLdBase {
    '@type': 'PodcastSeries';
    name: string;
    url: string;
}

export interface BlogPosting extends JsonLdBase {
    '@type': 'BlogPosting';
    headline: string;
    description?: string;
    datePublished?: string;
    dateModified?: string;
    articleBody?: string;
    url: string;
    image?: (ImageObject | string)[];
    author?: Person[];
    publisher: Organization;
    mainEntityOfPage?: string;
}

export interface PodcastEpisode extends JsonLdBase {
    '@type': 'PodcastEpisode';
    name: string;
    description?: string;
    datePublished?: string;
    duration: string;
    associatedMedia?: AudioObject;
    image?: (ImageObject | string)[];
    author?: Person[];
    partOfSeries?: PodcastSeries;
    url: string;
}

export interface SearchAction {
    '@type': 'SearchAction';
    target: {
        '@type': 'EntryPoint';
        urlTemplate: string;
    };
    'query-input': string;
}

export interface WebSite extends JsonLdBase {
    '@type': 'WebSite';
    name: string;
    url: string;
    potentialAction?: SearchAction;
}

