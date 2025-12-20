import { markdownToHtml } from '@/src/lib/rss/markdownToHtml';
import { escapeCdata, escapeXml, formatRssDate, sha256Hex } from '@/src/lib/rss/xml';
import {
  buildRssHeaders,
  fallbackFeedXml,
  fetchStrapiJson as fetchStrapiJsonCore,
  formatXml,
  maybeReturn304,
  normalizeBaseUrl,
} from '@/src/lib/rss/feedRoute';

const REVALIDATE_SECONDS = 86400; // heavy caching; explicit invalidation via /api/articlefeed/invalidate

const SITE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_DOMAIN ?? 'https://m10z.de');
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ? normalizeBaseUrl(process.env.NEXT_PUBLIC_STRAPI_URL) : '';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

type StrapiArticle = {
  id: number;
  slug: string;
  publishedAt: string | null;
  base: { title: string; description?: string | null };
  content: string;
};

type StrapiArticleFeedSingle = {
  channel: {
    title: string;
    description: string;
    mail: string;
  };
};

async function fetchStrapiJson<T>(pathWithQuery: string): Promise<T> {
  if (!STRAPI_URL) throw new Error('Missing NEXT_PUBLIC_STRAPI_URL');
  return await fetchStrapiJsonCore<T>({
    strapiBaseUrl: STRAPI_URL,
    apiPathWithQuery: pathWithQuery,
    token: STRAPI_TOKEN,
    revalidateSeconds: REVALIDATE_SECONDS,
    tags: ['feed:article', 'strapi:article', 'strapi:article-feed'],
  });
}

async function fetchAllArticles(): Promise<StrapiArticle[]> {
  const pageSize = 100;
  let page = 1;
  const all: StrapiArticle[] = [];

  while (true) {
    const query =
      `/api/articles?sort=publishedAt:desc&pagination[pageSize]=${pageSize}&pagination[page]=${page}&populate=*`;

    const res = await fetchStrapiJson<{
      data: unknown[];
      meta?: { pagination?: { page: number; pageCount: number; total: number } };
    }>(query);

    const items = Array.isArray(res.data) ? (res.data as StrapiArticle[]) : [];
    all.push(...items);

    const pagination = res.meta?.pagination;
    const done =
      !pagination ||
      typeof pagination.pageCount !== 'number' ||
      pagination.page >= pagination.pageCount ||
      items.length === 0;
    if (done) break;
    page++;
  }

  return all.filter((a) => Boolean(a.publishedAt));
}

async function fetchArticleFeedSingle(): Promise<StrapiArticleFeedSingle> {
  const res = await fetchStrapiJson<{ data: StrapiArticleFeedSingle }>(`/api/article-feed?populate=*`);
  return res.data;
}

function generateRssXml(args: {
  siteUrl: string;
  channel: StrapiArticleFeedSingle['channel'];
  articles: StrapiArticle[];
}): { xml: string; etagSeed: string; lastModified: Date | null } {
  const { siteUrl, channel, articles } = args;

  const now = new Date();
  const header =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n` +
    `  <channel>\n` +
    `    <title>${escapeXml(channel.title)}</title>\n` +
    `    <link>${escapeXml(siteUrl)}</link>\n` +
    `    <description>${escapeXml(channel.description)}</description>\n` +
    `    <language>de</language>\n` +
    `    <managingEditor>${escapeXml(channel.mail)}</managingEditor>\n` +
    `    <webMaster>${escapeXml(channel.mail)}</webMaster>\n` +
    `    <lastBuildDate>${formatRssDate(now)}</lastBuildDate>\n` +
    `    <atom:link href="${escapeXml(siteUrl)}/rss.xml" rel="self" type="application/rss+xml"/>\n`;

  const sorted = [...articles].sort((a, b) => {
    const ad = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bd = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bd - ad;
  });

  const items = sorted
    .map((a) => {
      const pub = a.publishedAt ? new Date(a.publishedAt) : new Date(0);
      const link = `${siteUrl}/artikel/${encodeURIComponent(a.slug)}`;

      const md = a.base.description ?? a.content ?? '';
      const html = markdownToHtml(md);
      const cdata = escapeCdata(html);

      const guid = sha256Hex(link);

      return (
        `    <item>\n` +
        `      <title>${escapeXml(a.base.title)}</title>\n` +
        `      <link>${escapeXml(link)}</link>\n` +
        `      <guid isPermaLink="false">${guid}</guid>\n` +
        `      <pubDate>${formatRssDate(pub)}</pubDate>\n` +
        `      <description><![CDATA[${cdata}]]></description>\n` +
        `    </item>\n`
      );
    })
    .join('');

  const footer = `  </channel>\n</rss>\n`;

  const latestPublishedAt = sorted[0]?.publishedAt ? new Date(sorted[0].publishedAt) : null;
  const etagSeed = `${sorted.length}:${latestPublishedAt?.toISOString() ?? 'none'}`;

  return { xml: `${header}${items}${footer}`, etagSeed, lastModified: latestPublishedAt };
}

async function getCachedArticleFeed() {
  'use cache';
  const [feed, articles] = await Promise.all([fetchArticleFeedSingle(), fetchAllArticles()]);
  const { xml, etagSeed, lastModified } = generateRssXml({
    siteUrl: SITE_URL,
    channel: feed.channel,
    articles,
  });
  const etag = `"${sha256Hex(etagSeed)}"`;
  return { xml, etag, lastModified };
}

export async function GET(request: Request) {
  try {
    const { xml, etag, lastModified } = await getCachedArticleFeed();
    const prettyXml = formatXml(xml, 2);

    const headers = buildRssHeaders({ etag, lastModified });
    const maybe304 = maybeReturn304(request, etag, headers);
    if (maybe304) return maybe304;

    return new Response(prettyXml, { headers });
  } catch {
    const fallback = fallbackFeedXml({
      title: 'M10Z Artikel',
      link: SITE_URL,
      selfLink: `${SITE_URL}/rss.xml`,
      description: 'Feed temporarily unavailable',
    });

    return new Response(formatXml(fallback, 2), {
      status: 503,
      headers: buildRssHeaders({}),
    });
  }
}
