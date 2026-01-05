import {recordDiagnosticEvent} from '@/src/lib/diagnostics/runtimeDiagnostics';
import {buildContentFeed, type ContentFeedResponse} from '@/src/lib/contentFeed';

/**
 * Serve a merged, paginated content feed of articles and podcasts.
 *
 * Accepts `page` and `pageSize` query parameters to select the page (defaults: page=1, pageSize=10; pageSize capped at 100). On success returns the combined feed JSON and sets caching headers; on failure returns a 500 JSON error payload.
 *
 * @param request - Incoming request whose URL query may include `page` and `pageSize`
 * @returns The combined content feed JSON on success, or `{ error: 'Failed to fetch content feed' }` with status 500 on failure
 */
export async function GET(request: Request) {
    const {searchParams} = new URL(request.url);
    const page = Math.max(1, Math.floor(Number(searchParams.get('page')) || 1));
    const pageSize = Math.max(1, Math.min(100, Math.floor(Number(searchParams.get('pageSize')) || 10)));
    const startedAt = Date.now();

    try {
        const response: ContentFeedResponse = await buildContentFeed(page, pageSize, {tags: ['page:home']});

        const durationMs = Date.now() - startedAt;
        if (durationMs >= 500) {
            recordDiagnosticEvent({
                ts: Date.now(),
                kind: 'route',
                name: 'api.contentfeed',
                ok: true,
                durationMs,
                detail: {
                    page: response.pagination.page,
                    pageSize: response.pagination.pageSize,
                    total: response.pagination.total,
                    returned: response.items.length,
                },
            });
        }

        return Response.json(response, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            },
        });
    } catch (error) {
        console.error('Error fetching content feed:', error);

        recordDiagnosticEvent({
            ts: Date.now(),
            kind: 'route',
            name: 'api.contentfeed',
            ok: false,
            durationMs: Date.now() - startedAt,
            detail: {
                page,
                pageSize,
            },
        });

        return Response.json({error: 'Failed to fetch content feed'}, {status: 500});
    }
}

