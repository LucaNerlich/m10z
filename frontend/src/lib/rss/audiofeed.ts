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
    StrapiYoutube,
} from '@/src/lib/rss/media';
import {escapeCdata, escapeXml, formatRssDate, sha256Hex} from '@/src/lib/rss/xml';

export type StrapiPodcast = {
    id: number;
    slug: string;
    publishedAt: string | null;
    base: StrapiBaseContent;
    categories?: StrapiCategoryRef[];
    youtube?: StrapiYoutube[];
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
    episodeFooter?: string | null;
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
        `        <ttl>${Math.round(cfg.ttlSeconds / 60)}</ttl>` +
        `        <language>${escapeXml(cfg.language)}</language>` +
        `        <copyright>${escapeXml(cfg.copyright)}</copyright>` +
        `        <webMaster>${escapeXml(`${cfg.webMaster} (${cfg.itunesAuthor})`)}</webMaster>` +
        `        <managingEditor>${escapeXml(`${cfg.authorEmail || channel.mail} (${cfg.itunesAuthor})`)}</managingEditor>` +
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

/**
 * Render an RSS <item> entry for a single podcast episode.
 *
 * Produces an XML string representing the episode, including title, publication date,
 * GUID (derived from the episode enclosure URL), iTunes image, CDATA-wrapped description
 * (shownotes plus optional footer converted from Markdown to HTML), author, explicit flag,
 * duration, and an enclosure tag with URL, length, and MIME type.
 *
 * @param cfg - Feed configuration (site URL, author/email, iTunes flags, etc.)
 * @param episode - Episode data from Strapi
 * @param episodeFooter - Optional footer content to append to the episode description (Markdown)
 * @returns An XML string for the episode's <item> element suitable for inclusion in an RSS feed, or `null` if no valid enclosure URL exists
 */
function renderItem(cfg: AudioFeedConfig, episode: StrapiPodcast, episodeFooter: string | null): string | null {
    const fileMedia = normalizeStrapiMedia(episode.file);
    const coverMedia = pickCoverMedia(episode.base, episode.categories);

    const enclosureUrl = mediaUrlToAbsolute({media: fileMedia});
    if (!enclosureUrl) {
        console.warn(`[audiofeed] Skipping episode "${episode.base.title}" (slug: ${episode.slug}): no valid enclosure URL`);
        return null;
    }
    const lengthBytes = normalizeEnclosureLengthBytes(fileMedia) ?? 0;

    const title = escapeXml(episode.base.title);
    const pubDateRaw = getEffectiveDate(episode);
    const pub = pubDateRaw ? new Date(pubDateRaw) : new Date(0);
    const pubDate = formatRssDate(pub);

    const itunesImageHref =
        mediaUrlToAbsolute({media: coverMedia}) ??
        `${cfg.siteUrl.replace(/\/+$/, '')}/static/img/formate/cover/m10z.jpg`;

    // Prepare and Sanitize Content
    // const description = escapeCdata(episode.base.description ?? '');
    const shownotes = (episode.shownotes ?? '').toString();
    const footer = episodeFooter ?? '';
    const htmlShownotes = markdownToHtml(shownotes);
    const htmlFooter = markdownToHtml(footer);
    const cdataShownotes = escapeCdata(htmlShownotes);
    const cdataFooter = escapeCdata(htmlFooter ? '<br/>' + htmlFooter : '');
    const description = `${cdataShownotes}${cdataFooter}`;

    const link = `${cfg.siteUrl.replace(/\/+$/, '')}/podcast/${encodeURIComponent(episode.slug)}`;

    const guid = sha256Hex(enclosureUrl);

    return (
        `<item>` +
        `    <title>${title}</title>` +
        `    <pubDate>${pubDate}</pubDate>` +
        `    <lastBuildDate>${pubDate}</lastBuildDate>` +
        `    <guid isPermaLink="false">${guid}</guid>` +
        `    <itunes:image href="${escapeXml(itunesImageHref)}"/>` +
        `    <description><![CDATA[${description}]]></description>` +
        `    <author>${escapeXml(cfg.authorEmail)}</author>` +
        `    <itunes:explicit>${cfg.itunesExplicit}</itunes:explicit>` +
        `    <link>${escapeXml(link)}</link>` +
        `    <itunes:duration>${episode.duration}</itunes:duration>` +
        `    <enclosure url="${escapeXml(enclosureUrl)}" length="${lengthBytes}" type="${escapeXml(fileMedia.mime ?? 'audio/mpeg')}"/>` +
        `</item>`
    );
}

/**
 * Generate the complete RSS/Atom XML for an audio podcast feed and return caching metadata.
 *
 * Filters the provided episodes to published ones, orders them by effective publish date (newest first),
 * renders the channel header and each episode item, and produces the final RSS XML string together with
 * an ETag seed and the latest published date for Last-Modified usage.
 *
 * @param cfg - Feed configuration used to populate channel and iTunes metadata and defaults
 * @param channel - Channel-level data (title, description, image, etc.) for the feed header
 * @param episodeFooter - Optional footer content appended to each episode's description
 * @param episodes - Array of podcast episodes to consider for inclusion in the feed
 * @returns An object with:
 *  - `xml`: the complete RSS/Atom feed XML as a string,
 *  - `etagSeed`: a seed string in the form `"<count>:<ISO date>"` or `"<count>:none"` when no publish date exists,
 *  - `lastModified`: the Date of the latest published episode or `null` if none
 */
export function generateAudioFeedXml(args: {
    cfg: AudioFeedConfig;
    channel: StrapiAudioFeedSingle['channel'];
    episodeFooter: StrapiAudioFeedSingle['episodeFooter'];
    episodes: StrapiPodcast[];
}): {xml: string; etagSeed: string; lastModified: Date | null} {
    const {cfg, channel, episodeFooter, episodes} = args;

    const channelImage = normalizeStrapiMedia(channel.image);
    const channelImageUrl =
        mediaUrlToAbsolute({media: channelImage}) ??
        `${cfg.siteUrl.replace(/\/+$/, '')}/static/img/formate/cover/m10z.jpg`;

    const sorted = [...episodes].sort((a, b) => {
        const ad = toDateTimestamp(getEffectiveDate(a)) ?? 0;
        const bd = toDateTimestamp(getEffectiveDate(b)) ?? 0;
        return bd - ad;
    });

    const latestDateRaw = getEffectiveDate(sorted[0]);
    const latestPublishedAt = latestDateRaw ? new Date(latestDateRaw) : null;
    // Use the latest published date for channel pubDate to avoid changing on every request.
    // Fallback to current time (not Unix epoch) aligns with RSS best practices and article feed pattern.
    const channelPubDate = latestPublishedAt ?? new Date();

    const header = renderChannelHeader(cfg, channel, channelImageUrl, channelPubDate);

    const items = sorted
        .map((ep) => renderItem(cfg, ep, episodeFooter ?? null))
        .filter((item): item is string => item !== null)
        .join('');
    const footer = `</channel></rss>`;

    const etagSeed = `${sorted.length}:${latestPublishedAt?.toISOString() ?? 'none'}`;

    return {
        xml: `${header}${items}${footer}`,
        etagSeed,
        lastModified: latestPublishedAt,
    };
}

