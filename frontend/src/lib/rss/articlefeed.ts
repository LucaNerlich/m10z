import {markdownToHtml} from '@/src/lib/rss/markdownToHtml';
import {pickBannerMedia, mediaUrlToAbsolute, type StrapiBaseContent, type StrapiCategoryRef} from '@/src/lib/rss/media';
import {escapeCdata, escapeXml, formatRssDate, sha256Hex} from '@/src/lib/rss/xml';

export type StrapiArticle = {
    id: number;
    slug: string;
    publishedAt: string | null;
    base: StrapiBaseContent;
    categories?: StrapiCategoryRef[];
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

    const now = new Date();
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

    const sorted = [...articles].sort((a, b) => {
        const ad = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const bd = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return bd - ad;
    });

    const items = sorted
        .filter((a) => Boolean(a.publishedAt))
        .map((a) => {
            const pub = a.publishedAt ? new Date(a.publishedAt) : new Date(0);
            const link = `${siteUrl}/artikel/${encodeURIComponent(a.slug)}`;
            const bannerMedia = pickBannerMedia(a.base, a.categories);
            const bannerUrl = mediaUrlToAbsolute({media: bannerMedia, strapiUrl});

            // Prefer teaser/description; fall back to full content.
            const md = a.base.description ?? a.content ?? '';
            const html = markdownToHtml(md);
            const cdata = escapeCdata(html);

            const guid = sha256Hex(link);

            return (
                `    <item>` +
                `      <title>${escapeXml(a.base.title)}</title>` +
                `      <link>${escapeXml(link)}</link>` +
                `      <guid isPermaLink="false">${guid}</guid>` +
                `      <pubDate>${formatRssDate(pub)}</pubDate>` +
                `      <description><![CDATA[${cdata}]]></description>` +
                (bannerUrl
                    ? `      <enclosure url="${escapeXml(bannerUrl)}" type="${escapeXml(bannerMedia?.mime ?? 'image/jpeg')}"/>`
                    : '') +
                `    </item>`
            );
        })
        .join('');

    const footer = `</channel></rss>`;

    const latestPublishedAt = sorted[0]?.publishedAt ? new Date(sorted[0].publishedAt) : null;
    const etagSeed = `${sorted.length}:${latestPublishedAt?.toISOString() ?? 'none'}`;

    return {xml: `${header}${items}${footer}`, etagSeed, lastModified: latestPublishedAt};
}


