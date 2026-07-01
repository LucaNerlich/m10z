/**
 * Minimal type definitions for the subset of the Podlove Web Player v5 episode and
 * configuration objects that we actually populate.
 *
 * The full schema is documented at
 * https://docs.podlove.org/podlove-web-player/v5/configuration — we only model the
 * fields used by the M10Z podcast detail page.
 */

export type PodloveAudioAsset = {
    /** Absolute or root-relative URL to the media asset. */
    url: string;
    /** File size in bytes, serialized as a string per Podlove's schema. */
    size?: string;
    /** Title shown in the download tab. */
    title?: string;
    /** Media MIME type, e.g. `audio/mpeg`. */
    mimeType?: string;
};

export type PodloveFileAsset = {
    url: string;
    size?: string;
    title?: string;
    mimeType?: string;
};

export type PodloveEpisodeConfig = {
    version: 5;
    title: string;
    subtitle?: string;
    summary?: string;
    /** ISO 8601 datetime. */
    publicationDate?: string;
    /** ISO 8601 duration in `[hh]:[mm]:[ss].[sss]` form. */
    duration?: string;
    poster?: string;
    link?: string;
    audio: PodloveAudioAsset[];
    files?: PodloveFileAsset[];
};

export type PodloveThemeTokens = {
    brand?: string;
    brandDark?: string;
    brandDarkest?: string;
    brandLightest?: string;
    shadeDark?: string;
    shadeBase?: string;
    contrast?: string;
    alt?: string;
};

export type PodloveShareChannel = 'facebook' | 'twitter' | 'whats-app' | 'linkedin' | 'pinterest' | 'xing' | 'mail' | 'link';

export type PodloveShareConfig = {
    channels: PodloveShareChannel[];
    sharePlaytime?: boolean;
    outlet?: string;
};

export type PodloveSubscribeClient = {
    /** Client id, e.g. `apple-podcasts`, `pocket-casts`, `overcast`, `rss`. */
    id: string;
    /** Optional client-specific service identifier (e.g. Apple podcast id or feed URL). */
    service?: string;
};

export type PodloveSubscribeButtonConfig = {
    /** RSS feed URL the subscribe overlay links to. */
    feed: string;
    /** Ordered list of supported podcast clients; only platform-relevant ones are shown. */
    clients: PodloveSubscribeClient[];
};

export type PodlovePlayerConfig = {
    version: 5;
    /**
     * Player asset base path; assets resolve relative to this. Omitted when loading from the CDN,
     * whose embed build self-resolves its runtime chunks.
     */
    base?: string;
    /** UI language, e.g. `de`. When omitted, the player auto-detects the browser locale. */
    language?: string;
    /**
     * Runtime overrides. The player derives its UI locale from `navigator.language` by default; set
     * `runtime.language`/`runtime.locale` to force a specific locale (e.g. German) regardless of the
     * visitor's browser.
     */
    runtime?: {
        language?: string;
        locale?: string;
    };
    /** Default active tab. */
    activeTab?: 'chapters' | 'files' | 'share' | 'playlist';
    theme?: {
        tokens?: PodloveThemeTokens;
    };
    share?: PodloveShareConfig;
    /** Subscribe button overlay; when omitted, no subscribe button is rendered. */
    'subscribe-button'?: PodloveSubscribeButtonConfig;
};
