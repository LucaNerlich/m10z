import {buildAudioFeedResponse} from '@/src/lib/rss/audioFeedRouteHandler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    return buildAudioFeedResponse(request);
}
