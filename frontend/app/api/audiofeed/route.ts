import {buildAudioFeedResponse} from '@/src/lib/rss/audioFeedRouteHandler';

export async function GET(request: Request) {
    return buildAudioFeedResponse(request);
}
