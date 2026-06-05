import {NextResponse} from 'next/server';

import {recordDiagnosticEvent} from '@/src/lib/diagnostics/runtimeDiagnostics';
import {getClientIp} from '@/src/lib/net/getClientIp';
import {sha256Hex} from '@/src/lib/rss/xml';
import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {
    augmentIndexWithStaticPages,
    getCachedFuse,
    loadSearchIndex,
    SearchIndexFetchError,
    SearchIndexValidationError,
    stripRecordContent,
} from '@/src/lib/search/searchIndexService';

export async function GET(request: Request) {
    const {searchParams} = new URL(request.url);
    const query = searchParams.get('q');
    const startedAt = Date.now();

    if (!query) {
        try {
            const content = await loadSearchIndex();
            const augmented = augmentIndexWithStaticPages(content);
            const publicRecords = stripRecordContent(augmented.records);
            const publicIndex = {...augmented, records: publicRecords};
            const expiresDate = new Date(Date.now() + 60000).toUTCString();
            const durationMs = Date.now() - startedAt;
            if (durationMs >= 500) {
                recordDiagnosticEvent({
                    ts: Date.now(),
                    kind: 'route',
                    name: 'api.search-index.full',
                    ok: true,
                    durationMs,
                    detail: {total: augmented.total},
                });
            }
            return NextResponse.json(publicIndex, {
                headers: {
                    'Cache-Control': 'public, max-age=60',
                    'Expires': expiresDate,
                },
            });
        } catch (error) {
            if (error instanceof SearchIndexFetchError) {
                console.error('[search-index] Failed to fetch search index:', error.message, error.stack);
                recordDiagnosticEvent({
                    ts: Date.now(),
                    kind: 'route',
                    name: 'api.search-index.full',
                    ok: false,
                    durationMs: Date.now() - startedAt,
                    detail: {error: 'FETCH'},
                });
                return NextResponse.json({error: 'Unable to fetch search index'}, {status: 502});
            }
            if (error instanceof SearchIndexValidationError) {
                console.error('[search-index] Malformed search index:', error.message, error.stack);
                recordDiagnosticEvent({
                    ts: Date.now(),
                    kind: 'route',
                    name: 'api.search-index.full',
                    ok: false,
                    durationMs: Date.now() - startedAt,
                    detail: {error: 'VALIDATION'},
                });
                return NextResponse.json({error: 'Internal server error'}, {status: 500});
            }
            console.error('[search-index] Unexpected error while fetching search index:', error);
            recordDiagnosticEvent({
                ts: Date.now(),
                kind: 'route',
                name: 'api.search-index.full',
                ok: false,
                durationMs: Date.now() - startedAt,
                detail: {error: 'ERROR'},
            });
            return NextResponse.json({error: 'Internal server error'}, {status: 500});
        }
    }

    try {
        const trimmedQuery = query.trim();
        if (trimmedQuery.length === 0) {
            return NextResponse.json({results: [], total: 0});
        }
        if (trimmedQuery.length < 2) {
            return NextResponse.json({results: [], total: 0, query: trimmedQuery});
        }
        if (trimmedQuery.length > 200) {
            return NextResponse.json({error: 'Query too long'}, {status: 400});
        }

        const ip = getClientIp(request);
        const rl = checkRateLimit(`search:${ip}`, {windowMs: 60_000, max: 100});
        if (!rl.ok) {
            return NextResponse.json(
                {error: 'Too Many Requests'},
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(rl.retryAfterSeconds),
                        'Cache-Control': 'no-store',
                    },
                },
            );
        }

        const index = await loadSearchIndex();
        const augmented = augmentIndexWithStaticPages(index);
        const etagSeed = `${trimmedQuery}:${augmented.version}:${augmented.generatedAt}`;
        const etag = `"${sha256Hex(etagSeed)}"`;

        const ifNoneMatch = request.headers.get('if-none-match');
        if (ifNoneMatch === etag) {
            return new NextResponse(null, {
                status: 304,
                headers: {
                    'Cache-Control': 'private, max-age=0, must-revalidate',
                    'ETag': etag,
                },
            });
        }

        const fuse = getCachedFuse(augmented);
        const results = fuse.search(trimmedQuery, {limit: 20}).map((match) => ({
            ...match.item,
            score: match.score ?? null,
        }));

        const durationMs = Date.now() - startedAt;
        if (durationMs >= 250) {
            recordDiagnosticEvent({
                ts: Date.now(),
                kind: 'route',
                name: 'api.search-index.query',
                ok: true,
                durationMs,
                detail: {
                    qLen: trimmedQuery.length,
                    results: results.length,
                },
            });
        }

        return NextResponse.json(
            {
                results,
                total: results.length,
                query: trimmedQuery,
            },
            {
                headers: {
                    'Cache-Control': 'private, max-age=0, must-revalidate',
                    'ETag': etag,
                },
            },
        );
    } catch (error) {
        if (error instanceof SearchIndexFetchError) {
            console.error('[search-index] Failed to fetch search index during search:', error.message, error.stack);
            recordDiagnosticEvent({
                ts: Date.now(),
                kind: 'route',
                name: 'api.search-index.query',
                ok: false,
                durationMs: Date.now() - startedAt,
                detail: {error: 'FETCH'},
            });
            return NextResponse.json({error: 'Unable to fetch search index'}, {status: 502});
        }
        if (error instanceof SearchIndexValidationError) {
            console.error('[search-index] Malformed search index during search:', error.message, error.stack);
            recordDiagnosticEvent({
                ts: Date.now(),
                kind: 'route',
                name: 'api.search-index.query',
                ok: false,
                durationMs: Date.now() - startedAt,
                detail: {error: 'VALIDATION'},
            });
            return NextResponse.json({error: 'Internal server error'}, {status: 500});
        }
        console.error('[search-index] Unexpected error during search:', error);
        recordDiagnosticEvent({
            ts: Date.now(),
            kind: 'route',
            name: 'api.search-index.query',
            ok: false,
            durationMs: Date.now() - startedAt,
            detail: {error: 'ERROR'},
        });
        return NextResponse.json({error: 'Internal server error'}, {status: 500});
    }
}
