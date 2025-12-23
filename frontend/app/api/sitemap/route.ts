import {buildArticleFeedResponse} from '@/src/lib/rss/articleFeedRouteHandler';
import {NextResponse} from 'next/server';

export async function GET(request: Request) {
    return NextResponse.redirect('/sitemap.xml');
}
