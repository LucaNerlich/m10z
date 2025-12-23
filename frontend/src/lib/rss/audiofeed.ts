import {getEffectiveDate, toDateTimestamp} from '@/src/lib/effectiveDate';
import {markdownToHtml} from '@/src/lib/rss/markdownToHtml';
import {
    mediaUrlToAbsolute,
    normalizeStrapiMedia,
    pickCoverMedia,
    type StrapiAuthor,
    type StrapiBaseContent,
    type StrapiCategoryRef,
    type StrapiMedia,
    type StrapiMediaRef,
} from '@/src/lib/rss/media';
import {filterPublished} from '@/src/lib/rss/publishDate';
import {escapeCdata, escapeXml, formatRssDate, sha256Hex} from '@/src/lib/rss/xml';

export type StrapiPodcast = {
    id: number;
    slug: string;
    publishedAt: string | null;
    base: StrapiBaseContent;
    categories?: StrapiCategoryRef[];
    shownotes?: string | null;
    duration: number;
    file: StrapiMediaRef;
    authors?: StrapiAuthor[];
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
    const coverMedia = pickCoverMedia(episode.base, episode.categories);

    const enclosureUrl = mediaUrlToAbsolute({media: fileMedia, strapiUrl}) ?? '';
    const lengthBytes = normalizeEnclosureLengthBytes(fileMedia) ?? 0;

    const title = escapeXml(episode.base.title);
    const pubDateRaw = getEffectiveDate(episode);
    const pub = pubDateRaw ? new Date(pubDateRaw) : new Date(0);
    const pubDate = formatRssDate(pub);

    const itunesImageHref =
        mediaUrlToAbsolute({media: coverMedia, strapiUrl}) ??
        `${cfg.siteUrl.replace(/\/+$/, '')}/static/img/formate/cover/m10z.jpg`;

    // Prepare and Sanitize Content
    // const description = escapeCdata(episode.base.description ?? '');
    const shownotes = (episode.shownotes ?? '').toString();
    const html = markdownToHtml(shownotes);
    const cdataShownotes = escapeCdata(html);

    const link = `${cfg.siteUrl.replace(/\/+$/, '')}/podcast/${encodeURIComponent(episode.slug)}`;

    const guid = sha256Hex(enclosureUrl);

    return (
        `        <item>` +
        `            <title>${title}</title>` +
        `            <pubDate>${pubDate}</pubDate>` +
        `            <lastBuildDate>${pubDate}</lastBuildDate>` +
        `            <guid isPermaLink="false">${guid}</guid>` +
        `            <itunes:image href="${escapeXml(itunesImageHref)}"/>` +
        `            <description><![CDATA[${cdataShownotes}]]></description>` +
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

    const nowTs = Date.now();
    const published = filterPublished(episodes, (ep) => getEffectiveDate(ep), nowTs);
    const channelImage = normalizeStrapiMedia(channel.image);
    const channelImageUrl =
        mediaUrlToAbsolute({media: channelImage, strapiUrl}) ??
        `${cfg.siteUrl.replace(/\/+$/, '')}/static/img/formate/cover/m10z.jpg`;

    const sorted = [...published].sort((a, b) => {
        const ad = toDateTimestamp(getEffectiveDate(a)) ?? 0;
        const bd = toDateTimestamp(getEffectiveDate(b)) ?? 0;
        return bd - ad;
    });

    const latestDateRaw = getEffectiveDate(sorted[0]);
    const latestPublishedAt = latestDateRaw ? new Date(latestDateRaw) : null;
    // Use the latest published date for channel pubDate to avoid changing on every request.
    const channelPubDate = latestPublishedAt ?? new Date(0);

    const header = renderChannelHeader(cfg, channel, channelImageUrl, channelPubDate);

    const items = sorted.map((ep) => renderItem(cfg, ep, strapiUrl)).join('');
    const footer = `</channel></rss>`;

    const etagSeed = `${sorted.length}:${latestPublishedAt?.toISOString() ?? 'none'}`;

    return {
        xml: `${header}${items}${footer}`,
        etagSeed,
        lastModified: latestPublishedAt,
    };
}


