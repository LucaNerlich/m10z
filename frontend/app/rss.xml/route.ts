import {buildArticleFeedResponse} from '@/src/lib/rss/articleFeedRouteHandler';

export async function GET(request: Request) {
    return buildArticleFeedResponse(request);
}
