import {markdownToHtml} from '@/src/lib/rss/markdownToHtml';
import {getEffectiveDate, toDateTimestamp} from '@/src/lib/effectiveDate';
import {
    mediaUrlToAbsolute,
    normalizeStrapiMedia,
    pickBannerMedia,
    type StrapiAuthor,
    type StrapiBaseContent,
    type StrapiCategoryRef,
    type StrapiMediaRef,
    StrapiYoutube,
} from '@/src/lib/rss/media';
import {filterPublished} from '@/src/lib/rss/publishDate';
import {escapeCdata, escapeXml, formatRssDate, sha256Hex} from '@/src/lib/rss/xml';

export type StrapiArticle = {
    id: number;
    slug: string;
    publishedAt: string | null;
    base: StrapiBaseContent;
    categories?: StrapiCategoryRef[];
    authors?: StrapiAuthor[];
    youtube?: StrapiYoutube[];
    content: string;
};

export type StrapiArticleFeedSingle = {
    channel: {
        title: string;
        description: string;
        mail: string;
        image: StrapiMediaRef;
    };
};

/**
 * Builds an RSS 2.0 feed XML document from the provided articles and returns feed content plus caching metadata.
 *
 * @param args.siteUrl - Base URL of the site (e.g. https://m10z.de) used to construct item links and the self-referencing atom link.
 * @param args.strapiUrl - Base URL of the Strapi instance (kept for media/URL resolution context).
 * @param args.channel - Channel metadata (title, description, mail) used for feed header fields.
 * @param args.articles - Array of articles to include; only articles considered published as of the call time are included and are sorted by effective date (newest first).
 * @returns An object with:
 *   - `xml`: the complete RSS 2.0 XML document as a string,
 *   - `etagSeed`: a seed string (formatted as "<itemCount>:<latestPublishedAt|none>") suitable for computing an ETag,
 *   - `lastModified`: the Date of the latest published article or `null` if there are no published articles.
 */
export function generateArticleFeedXml(args: {
    siteUrl: string; // e.g. https://m10z.de
    strapiUrl: string;
    channel: StrapiArticleFeedSingle['channel'];
    articles: StrapiArticle[];
}): {xml: string; etagSeed: string; lastModified: Date | null} {
    const {siteUrl, strapiUrl, channel, articles} = args;

    const nowTs = Date.now();
    const now = new Date(nowTs);
    const published = filterPublished(articles, (a) => getEffectiveDate(a), nowTs);
    const channelImage = normalizeStrapiMedia(channel.image);
    const channelImageUrl =
        mediaUrlToAbsolute({media: channelImage}) ??
        `${siteUrl}/images/m10z.jpg`;
    const header =
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">` +
        `  <channel>` +
        `    <title>${escapeXml(channel.title)}</title>` +
        `    <link>${escapeXml(siteUrl)}</link>` +
        `    <description>${escapeXml(channel.description)}</description>` +
        `    <language>de</language>` +
        `    <managingEditor>${escapeXml(channel.mail)}</managingEditor>` +
        `    <webMaster>${escapeXml(channel.mail)}</webMaster>` +
        `    <lastBuildDate>${formatRssDate(now)}</lastBuildDate>` +
        `    <atom:link href="${escapeXml(siteUrl)}/rss.xml" rel="self" type="application/rss+xml"/>` +
        `    <image>` +
        `      <url>${escapeXml(channelImageUrl)}</url>` +
        `      <title>${escapeXml(channel.title)}</title>` +
        `      <link>${escapeXml(siteUrl)}</link>` +
        `    </image>`;

    const sorted = [...published].sort((a, b) => {
        const ad = toDateTimestamp(getEffectiveDate(a)) ?? 0;
        const bd = toDateTimestamp(getEffectiveDate(b)) ?? 0;
        return bd - ad;
    });

    const items = sorted
        .map((a) => {
            const pubRaw = getEffectiveDate(a);
            const pub = pubRaw ? new Date(pubRaw) : new Date(0);
            const link = `${siteUrl}/artikel/${encodeURIComponent(a.slug)}`;
            const bannerMedia = pickBannerMedia(a.base, a.categories);
            const bannerUrl = mediaUrlToAbsolute({media: bannerMedia});

            // Prepare and Sanitize Content
            const title = escapeXml(a.base.title);
            const description = escapeXml(a.base.description ?? '');
            const html = markdownToHtml(a.content ?? '');
            const cdataContent = escapeCdata(html);

            // todo add youtube urls

            const guid = sha256Hex(link);

            return (
                `    <item>` +
                `      <title>${title}</title>` +
                `      <link>${escapeXml(link)}</link>` +
                `      <guid isPermaLink="false">${guid}</guid>` +
                `      <pubDate>${formatRssDate(pub)}</pubDate>` +
                `      <description>${description}</description>` +
                `      <content:encoded><![CDATA[${cdataContent}]]></content:encoded>` +
                (bannerUrl
                    ? `      <enclosure url="${escapeXml(bannerUrl)}" length="${bannerMedia?.sizeInBytes ?? 0}" type="${escapeXml(bannerMedia?.mime ?? 'image/jpeg')}"/>`
                    : '') +
                `    </item>`
            );
        })
        .join('');

    const footer = `</channel></rss>`;

    const latestRaw = getEffectiveDate(sorted[0]);
    const latestPublishedAt = latestRaw ? new Date(latestRaw) : null;
    const etagSeed = `${sorted.length}:${latestPublishedAt?.toISOString() ?? 'none'}`;

    return {xml: `${header}${items}${footer}`, etagSeed, lastModified: latestPublishedAt};
}

