import {markdownToHtml} from '@/src/lib/rss/markdownToHtml';
import {
    mediaUrlToAbsolute,
    pickBannerMedia,
    type StrapiAuthor,
    type StrapiBaseContent,
    type StrapiCategoryRef,
} from '@/src/lib/rss/media';
import {filterPublished} from '@/src/lib/rss/publishDate';
import {escapeCdata, escapeXml, formatRssDate, sha256Hex} from '@/src/lib/rss/xml';

export type StrapiArticle = {
    id: number;
    slug: string;
    publishDate?: string | null;
    publishedAt: string | null;
    base: StrapiBaseContent;
    categories?: StrapiCategoryRef[];
    authors?: StrapiAuthor[];
    content: string;
};

export type StrapiArticleFeedSingle = {
    channel: {
        title: string;
        description: string;
        mail: string;
    };
};

export function generateArticleFeedXml(args: {
    siteUrl: string; // e.g. https://m10z.de
    strapiUrl: string;
    channel: StrapiArticleFeedSingle['channel'];
    articles: StrapiArticle[];
}): {xml: string; etagSeed: string; lastModified: Date | null} {
    const {siteUrl, strapiUrl, channel, articles} = args;

    const nowTs = Date.now();
    const now = new Date(nowTs);
    const published = filterPublished(articles, (a) => a.publishDate ?? a.publishedAt, nowTs);
    const header =
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">` +
        `  <channel>` +
        `    <title>${escapeXml(channel.title)}</title>` +
        `    <link>${escapeXml(siteUrl)}</link>` +
        `    <description>${escapeXml(channel.description)}</description>` +
        `    <language>de</language>` +
        `    <managingEditor>${escapeXml(channel.mail)}</managingEditor>` +
        `    <webMaster>${escapeXml(channel.mail)}</webMaster>` +
        `    <lastBuildDate>${formatRssDate(now)}</lastBuildDate>` +
        `    <atom:link href="${escapeXml(siteUrl)}/rss.xml" rel="self" type="application/rss+xml"/>`;

    const sorted = [...published].sort((a, b) => {
        const adRaw = a.publishDate ?? a.publishedAt;
        const bdRaw = b.publishDate ?? b.publishedAt;
        const ad = adRaw ? new Date(adRaw).getTime() : 0;
        const bd = bdRaw ? new Date(bdRaw).getTime() : 0;
        return bd - ad;
    });

    const items = sorted
        .map((a) => {
            const pubRaw = a.publishDate ?? a.publishedAt;
            const pub = pubRaw ? new Date(pubRaw) : new Date(0);
            const link = `${siteUrl}/artikel/${encodeURIComponent(a.slug)}`;
            const bannerMedia = pickBannerMedia(a.base, a.categories);
            const bannerUrl = mediaUrlToAbsolute({media: bannerMedia, strapiUrl});

            // Prepare and Sanitize Content
            const title = escapeXml(a.base.title);
            const description = a.base.description ?? '';
            const html = markdownToHtml(a.content ?? '');
            const cdataContent = escapeCdata(html);

            const guid = sha256Hex(link);

            return (
                `    <item>` +
                `      <title>${escapeXml(title)}</title>` +
                `      <link>${escapeXml(link)}</link>` +
                `      <guid isPermaLink="false">${guid}</guid>` +
                `      <pubDate>${formatRssDate(pub)}</pubDate>` +
                `      <description>${description}></description>` +
                `      <content:encoded><![CDATA[${cdataContent}]]></content:encoded>` +
                (bannerUrl
                    ? `      <enclosure url="${escapeXml(bannerUrl)}" type="${escapeXml(bannerMedia?.mime ?? 'image/jpeg')}"/>`
                    : '') +
                `    </item>`
            );
        })
        .join('');

    const footer = `</channel></rss>`;

    const latestRaw = sorted[0]?.publishDate ?? sorted[0]?.publishedAt;
    const latestPublishedAt = latestRaw ? new Date(latestRaw) : null;
    const etagSeed = `${sorted.length}:${latestPublishedAt?.toISOString() ?? 'none'}`;

    return {xml: `${header}${items}${footer}`, etagSeed, lastModified: latestPublishedAt};
}


