import {buildArticleFeedResponse} from '@/src/lib/rss/articleFeedRouteHandler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    return buildArticleFeedResponse(request);
}
