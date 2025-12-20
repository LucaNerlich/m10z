import {markdownToHtml} from '@/src/lib/rss/markdownToHtml';
import {escapeCdata, escapeXml, formatRssDate, sha256Hex} from '@/src/lib/rss/xml';

type StrapiMedia = {
    url?: string;
    mime?: string;
    // Strapi upload size is commonly KB (number), but can vary; we normalize downstream.
    size?: number;
    sizeInBytes?: number;
};

type StrapiMediaRef = {
    url?: string;
    mime?: string;
    size?: number;
    sizeInBytes?: number;
    // In Strapi v4: { data: { attributes: { ... } } }, in v5: direct fields.
    data?: {attributes?: StrapiMedia} | null;
    attributes?: StrapiMedia;
};

type StrapiBaseContent = {
    title: string;
    description?: string | null;
    cover?: StrapiMediaRef | null;
    banner?: StrapiMediaRef | null;
};

export type StrapiPodcast = {
    id: number;
    slug: string;
    publishedAt: string | null;
    base: StrapiBaseContent;
    shownotes?: string | null;
    duration: number;
    file: StrapiMediaRef;
};

export type StrapiAudioFeedSingle = {
    channel: {
        title: string;
        description: string;
        mail: string;
        image: StrapiMediaRef;
    };
};

export type AudioFeedConfig = {
    siteUrl: string; // e.g. https://m10z.de
    // Constants that exist in the legacy template; keep stable.
    ttlSeconds: number;
    language: string;
    copyright: string;
    webMaster: string;
    authorEmail: string;
    itunesAuthor: string;
    itunesExplicit: 'false' | 'true';
    itunesType: 'episodic' | 'serial';
    podcastGuid: string;
};

export function normalizeStrapiMedia(ref: StrapiMediaRef | null | undefined): StrapiMedia {
    if (!ref) return {};
    // v5: fields at root OR v4: attributes or data.attributes
    const attrs = ref.attributes ?? ref.data?.attributes ?? ref;
    return {
        url: attrs.url,
        mime: attrs.mime,
        size: attrs.size,
        sizeInBytes: attrs.sizeInBytes,
    };
}

export function toAbsoluteUrl(siteUrl: string, maybeRelativeUrl: string | undefined): string | undefined {
    if (!maybeRelativeUrl) return undefined;
    if (/^https?:\/\//i.test(maybeRelativeUrl)) return maybeRelativeUrl;
    const base = siteUrl.replace(/\/+$/, '');
    const path = maybeRelativeUrl.startsWith('/') ? maybeRelativeUrl : `/${maybeRelativeUrl}`;
    return `${base}${path}`;
}

export function normalizeEnclosureLengthBytes(media: StrapiMedia): number | undefined {
    if (typeof media.sizeInBytes === 'number' && Number.isFinite(media.sizeInBytes)) {
        return Math.max(0, Math.floor(media.sizeInBytes));
    }
    if (typeof media.size === 'number' && Number.isFinite(media.size)) {
        // Strapi upload plugin commonly stores `size` in KB.
        return Math.max(0, Math.floor(media.size * 1024));
    }
    return undefined;
}

function renderChannelHeader(
    cfg: AudioFeedConfig,
    channel: StrapiAudioFeedSingle['channel'],
    channelImageUrl: string,
    pubDate: Date,
): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:podcast="https://podcastindex.org/namespace/1.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">` +
        `    <channel>` +
        `        <title>${escapeXml(channel.title)}</title>` +
        `        <link>${escapeXml(cfg.siteUrl)}</link>` +
        `        <description>${escapeXml(channel.description)}</description>` +
        `        <ttl>${cfg.ttlSeconds}</ttl>` +
        `        <language>${escapeXml(cfg.language)}</language>` +
        `        <copyright>${escapeXml(cfg.copyright)}</copyright>` +
        `        <webMaster>${escapeXml(cfg.webMaster)}</webMaster>` +
        `        <author>${escapeXml(cfg.authorEmail)}</author>` +
        `        <itunes:category text="Leisure"/>` +
        `        <itunes:owner>` +
        `            <itunes:name>M10Z</itunes:name>` +
        `            <itunes:email>${escapeXml(channel.mail)}</itunes:email>` +
        `        </itunes:owner>` +
        `        <itunes:author>${escapeXml(cfg.itunesAuthor)}</itunes:author>` +
        `        <itunes:explicit>${cfg.itunesExplicit}</itunes:explicit>` +
        `        <itunes:type>${cfg.itunesType}</itunes:type>` +
        `        <itunes:image href="${escapeXml(channelImageUrl)}"/>` +
        `        <image>` +
        `            <url>${escapeXml(channelImageUrl)}</url>` +
        `            <title>${escapeXml(channel.title)}</title>` +
        `            <link>${escapeXml(cfg.siteUrl)}</link>` +
        `        </image>` +
        `        <atom:link href="${escapeXml(cfg.siteUrl.replace(/\/+$/, ''))}/audiofeed.xml" rel="self" type="application/rss+xml"/>` +
        `        <podcast:guid>${escapeXml(cfg.podcastGuid)}</podcast:guid>` +
        `        <pubDate>${formatRssDate(pubDate)}</pubDate>`;
}

function renderItem(cfg: AudioFeedConfig, episode: StrapiPodcast, strapiUrl: string): string {
    const fileMedia = normalizeStrapiMedia(episode.file);
    const baseCoverMedia = normalizeStrapiMedia(episode.base.cover ?? undefined);

    const enclosureUrl = toAbsoluteUrl(strapiUrl, fileMedia.url) ?? '';
    const lengthBytes = normalizeEnclosureLengthBytes(fileMedia) ?? 0;

    const title = escapeXml(episode.base.title);
    const pub = episode.publishedAt ? new Date(episode.publishedAt) : new Date(0);
    const pubDate = formatRssDate(pub);

    const itunesImageHref =
        toAbsoluteUrl(strapiUrl, baseCoverMedia.url) ??
        `${cfg.siteUrl.replace(/\/+$/, '')}/static/img/formate/cover/m10z.jpg`;

    const md = (episode.shownotes ?? episode.base.description ?? '').toString();
    const html = markdownToHtml(md);
    const cdata = escapeCdata(html);

    // Preserve existing “link” pattern as much as possible: legacy feed links are top-level `/${slug}`.
    const link = `${cfg.siteUrl.replace(/\/+$/, '')}/${encodeURIComponent(episode.slug)}`;

    const guid = sha256Hex(enclosureUrl);

    return (
        `        <item>` +
        `            <title>${title}</title>` +
        `            <pubDate>${pubDate}</pubDate>` +
        `            <lastBuildDate>${pubDate}</lastBuildDate>` +
        `            <guid isPermaLink="false">${guid}</guid>` +
        `            <itunes:image href="${escapeXml(itunesImageHref)}"/>` +
        `            <description><![CDATA[${cdata}]]></description>` +
        `            <author>${escapeXml(cfg.authorEmail)}</author>` +
        `            <itunes:explicit>${cfg.itunesExplicit}</itunes:explicit>` +
        `            <link>${escapeXml(link)}</link>` +
        `            <itunes:duration>${episode.duration}</itunes:duration>` +
        `            <enclosure url="${escapeXml(enclosureUrl)}" length="${lengthBytes}" type="${escapeXml(fileMedia.mime ?? 'audio/mpeg')}"/>` +
        `        </item>`
    );
}

export function generateAudioFeedXml(args: {
    cfg: AudioFeedConfig;
    strapiUrl: string;
    channel: StrapiAudioFeedSingle['channel'];
    episodes: StrapiPodcast[];
}): {xml: string; etagSeed: string; lastModified: Date | null} {
    const {cfg, strapiUrl, channel, episodes} = args;

    const channelImage = normalizeStrapiMedia(channel.image);
    const channelImageUrl =
        toAbsoluteUrl(strapiUrl, channelImage.url) ??
        `${cfg.siteUrl.replace(/\/+$/, '')}/static/img/formate/cover/m10z.jpg`;

    const now = new Date();
    const header = renderChannelHeader(cfg, channel, channelImageUrl, now);

    const sorted = [...episodes].sort((a, b) => {
        const ad = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const bd = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return bd - ad;
    });

    const items = sorted.map((ep) => renderItem(cfg, ep, strapiUrl)).join('');
    const footer = `</channel></rss>`;

    const latestPublishedAt = sorted[0]?.publishedAt ? new Date(sorted[0].publishedAt) : null;
    const etagSeed = `${sorted.length}:${latestPublishedAt?.toISOString() ?? 'none'}`;

    return {
        xml: `${header}${items}${footer}`,
        etagSeed,
        lastModified: latestPublishedAt,
    };
}


