import {getEffectiveDate, toDateTimestamp} from '@/src/lib/effectiveDate';
import {markdownToHtml} from '@/src/lib/rss/markdownToHtml';
import {
    getOptimalMediaFormat,
    mediaUrlToAbsolute,
    normalizeStrapiMedia,
    pickCoverOrBannerMedia,
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
    wordCount?: number | null;
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

type TimingOp = 'markdownConversion' | 'guidGeneration' | 'fileMetadata' | 'enclosure';

export type TimingSummary = {
    count: number;
    totalMs: number;
    minMs: number;
    maxMs: number;
    avgMs: number;
};

export type AudioFeedTiming = Record<TimingOp, TimingSummary>;

export type AudioFeedTimingCollector = {
    record(op: TimingOp, durationMs: number): void;
};

export type AudioFeedMarkdownConverter = (args: {
    episodeId: number;
    kind: 'shownotes' | 'footer';
    markdownText: string;
}) => string;

/**
 * Get the current timestamp in milliseconds, preferring high-resolution timers when available.
 *
 * @returns The current time in milliseconds — uses `performance.now()` if available, otherwise `Date.now()`.
 */
function nowMs(): number {
    // Prefer high-resolution timers when available.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (globalThis as any).performance;
    if (p && typeof p.now === 'function') return p.now() as number;
    return Date.now();
}

/**
 * Creates a timing aggregator for per-operation performance measurements.
 *
 * The returned collector accumulates counts and durations for each TimingOp and the summarize method
 * produces a TimingSummary for each operation with millisecond values rounded to three decimals.
 *
 * @returns An object containing:
 *  - `collector`: a AudioFeedTimingCollector with `record(op, durationMs)` which adds one sample for `op`. `durationMs` is clamped to 0 if non-finite or negative before accumulation; count, totalMs, minMs, and maxMs are updated accordingly.
 *  - `summarize()`: returns an AudioFeedTiming mapping each TimingOp to a TimingSummary `{ count, totalMs, minMs, maxMs, avgMs }`. `totalMs`, `minMs`, `maxMs`, and `avgMs` are rounded to three decimal places; when `count` is 0, min/max/avg are `0`.
 */
function createTimingAggregator(): {
    collector: AudioFeedTimingCollector;
    summarize(): AudioFeedTiming;
} {
    const agg: Record<TimingOp, {count: number; totalMs: number; minMs: number; maxMs: number}> = {
        markdownConversion: {count: 0, totalMs: 0, minMs: Number.POSITIVE_INFINITY, maxMs: 0},
        guidGeneration: {count: 0, totalMs: 0, minMs: Number.POSITIVE_INFINITY, maxMs: 0},
        fileMetadata: {count: 0, totalMs: 0, minMs: Number.POSITIVE_INFINITY, maxMs: 0},
        enclosure: {count: 0, totalMs: 0, minMs: Number.POSITIVE_INFINITY, maxMs: 0},
    };

    return {
        collector: {
            record(op: TimingOp, durationMs: number) {
                const safe = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
                const v = agg[op];
                v.count += 1;
                v.totalMs += safe;
                v.minMs = Math.min(v.minMs, safe);
                v.maxMs = Math.max(v.maxMs, safe);
            },
        },
        summarize() {
            const toSummary = (v: {count: number; totalMs: number; minMs: number; maxMs: number}): TimingSummary => {
                const count = v.count;
                const totalMs = Math.round(v.totalMs * 1000) / 1000;
                const minMs = count ? Math.round(v.minMs * 1000) / 1000 : 0;
                const maxMs = count ? Math.round(v.maxMs * 1000) / 1000 : 0;
                const avgMs = count ? Math.round((v.totalMs / count) * 1000) / 1000 : 0;
                return {count, totalMs, minMs, maxMs, avgMs};
            };

            return {
                markdownConversion: toSummary(agg.markdownConversion),
                guidGeneration: toSummary(agg.guidGeneration),
                fileMetadata: toSummary(agg.fileMetadata),
                enclosure: toSummary(agg.enclosure),
            };
        },
    };
}

/**
 * Normalize a Strapi media object's size into bytes.
 *
 * If `media.sizeInBytes` is a finite number, it is floored and clamped to zero.
 * Otherwise, if `media.size` is a finite number, it is interpreted as kilobytes
 * (Strapi upload plugin convention) and converted to bytes, then floored and clamped to zero.
 *
 * @param media - The Strapi media object whose size should be normalized.
 * @returns The size in bytes as an integer (>= 0), or `undefined` if no valid size is available.
 */
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
    return `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:podcast="https://podcastindex.org/namespace/1.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">` +
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
 * @param timings - Optional per-operation timing collector (used for diagnostics)
 * @returns An XML string for the episode's <item> element suitable for inclusion in an RSS feed, or `null` if no valid enclosure URL exists
 */
function renderItem(
    cfg: AudioFeedConfig,
    episode: StrapiPodcast,
    episodeFooter: string | null,
    timings?: AudioFeedTimingCollector,
    markdownConverter?: AudioFeedMarkdownConverter,
): string | null {
    const tFileMeta0 = nowMs();
    const fileMedia = normalizeStrapiMedia(episode.file);
    const lengthBytes = normalizeEnclosureLengthBytes(fileMedia) ?? 0;
    const enclosureType = fileMedia.mime ?? 'audio/mpeg';
    const tFileMeta1 = nowMs();
    timings?.record('fileMetadata', tFileMeta1 - tFileMeta0);

    const tEnclosure0 = nowMs();
    const enclosureUrl = mediaUrlToAbsolute({media: fileMedia});
    const tEnclosure1 = nowMs();
    timings?.record('enclosure', tEnclosure1 - tEnclosure0);
    if (!enclosureUrl) {
        console.warn(`[audiofeed] Skipping episode "${episode.base.title}" (slug: ${episode.slug}): no valid enclosure URL`);
        return null;
    }

    const title = escapeXml(episode.base.title);
    const pubDateRaw = getEffectiveDate(episode);
    const pub = pubDateRaw ? new Date(pubDateRaw) : new Date(0);
    const pubDate = formatRssDate(pub);

    const preferredMedia = pickCoverOrBannerMedia(episode.base, episode.categories);
    const optimizedMedia = preferredMedia ? getOptimalMediaFormat(preferredMedia, 'medium') : undefined;
    const itunesImageHref =
        mediaUrlToAbsolute({media: optimizedMedia}) ??
        `${cfg.siteUrl.replace(/\/+$/, '')}/static/img/formate/cover/m10z.jpg`;

    // Prepare and Sanitize Content
    const effectiveDescription = episode.base.description || episode.categories?.[0]?.base?.description;
    const shownotes = (episode.shownotes ?? '').toString();
    const footer = episodeFooter ?? '';
    // Use shownotes if available, otherwise fall back to base.description (with category fallback)
    const descriptionText = shownotes || effectiveDescription || '';
    const tMd0 = nowMs();
    const convert =
        markdownConverter ??
        ((args: {markdownText: string}) => {
            return markdownToHtml(args.markdownText);
        });
    const htmlShownotes = convert({episodeId: episode.id, kind: 'shownotes', markdownText: descriptionText});
    const htmlFooter = convert({episodeId: episode.id, kind: 'footer', markdownText: footer});
    const tMd1 = nowMs();
    timings?.record('markdownConversion', tMd1 - tMd0);
    const cdataShownotes = escapeCdata(htmlShownotes);
    const cdataFooter = escapeCdata(htmlFooter ? '<br/>' + htmlFooter : '');
    const description = `${cdataShownotes}${cdataFooter}`;

    const link = `${cfg.siteUrl.replace(/\/+$/, '')}/podcasts/${encodeURIComponent(episode.slug)}`;

    const tGuid0 = nowMs();
    const guid = sha256Hex(enclosureUrl);
    const tGuid1 = nowMs();
    timings?.record('guidGeneration', tGuid1 - tGuid0);

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
        `    <enclosure url="${escapeXml(enclosureUrl)}" length="${lengthBytes}" type="${escapeXml(enclosureType)}"/>` +
        `</item>`
    );
}

/**
 * Produce the complete RSS/Atom XML for an audio podcast feed and return related caching and timing metadata.
 *
 * Filters and orders the provided episodes, renders the channel header and episode items, and returns the
 * assembled XML plus ETag seed, last-modified date, timing summary, and the count of successfully rendered items.
 *
 * @param args - Function inputs
 * @param args.cfg - Feed configuration (site URL, TTL, iTunes settings, etc.)
 * @param args.channel - Channel metadata for the feed
 * @param args.episodeFooter - Optional footer content appended to each episode's description
 * @param args.episodes - Array of episode objects to include in the feed
 * @param args.timings - Optional timing collector that will receive per-operation timing samples
 * @param args.markdownConverter - Optional converter to transform episode markdown (`shownotes`/`footer`) into HTML
 * @returns An object containing:
 *  - `xml`: the complete RSS/Atom feed XML string
 *  - `etagSeed`: a seed string in the form `"<count>:<ISO date>"` where `<count>` is the total episodes considered and `<ISO date>` is the latest published date or `"none"`
 *  - `lastModified`: the Date of the latest published episode, or `null` if none are published
 *  - `timing`: aggregated per-operation timing summaries for markdown conversion, GUID generation, file metadata and enclosure processing
 *  - `renderedEpisodeCount`: the number of episodes successfully rendered into feed items
 */
export function generateAudioFeedXml(args: {
    cfg: AudioFeedConfig;
    channel: StrapiAudioFeedSingle['channel'];
    episodeFooter: StrapiAudioFeedSingle['episodeFooter'];
    episodes: StrapiPodcast[];
    timings?: AudioFeedTimingCollector;
    markdownConverter?: AudioFeedMarkdownConverter;
}): {xml: string; etagSeed: string; lastModified: Date | null; timing: AudioFeedTiming; renderedEpisodeCount: number} {
    const {cfg, channel, episodeFooter, episodes} = args;
    const aggregator = createTimingAggregator();
    const internalCollector = aggregator.collector;
    const externalCollector = args.timings;
    const timingCollector: AudioFeedTimingCollector = externalCollector
        ? {
              record(op, durationMs) {
                  // Always feed the internal aggregator so `timing: aggregator.summarize()` is accurate,
                  // even when callers provide a separate collector.
                  internalCollector.record(op, durationMs);
                  externalCollector.record(op, durationMs);
              },
          }
        : internalCollector;

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

    let renderedEpisodeCount = 0;
    const items = sorted
        .map((ep) => {
            const item = renderItem(cfg, ep, episodeFooter ?? null, timingCollector, args.markdownConverter);
            if (item !== null) renderedEpisodeCount += 1;
            return item;
        })
        .filter((item): item is string => item !== null)
        .join('');
    const footer = `</channel></rss>`;

    const etagSeed = `${sorted.length}:${latestPublishedAt?.toISOString() ?? 'none'}`;

    return {
        xml: `${header}${items}${footer}`,
        etagSeed,
        lastModified: latestPublishedAt,
        timing: aggregator.summarize(),
        renderedEpisodeCount,
    };
}
