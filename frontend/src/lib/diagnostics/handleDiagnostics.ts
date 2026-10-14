import {NextResponse} from 'next/server';

import {getMarkdownToHtmlState} from '@/src/lib/rss/markdownToHtml';

import {requireDiagnosticsAuth} from './requireDiagnosticsAuth';
import {getRecentDiagnosticEvents} from './runtimeDiagnostics';
import {getAudioFeedRuntimeState} from '../rss/audioFeedRouteHandler';
import {getSchedulerState as getArticleFeedSchedulerState} from '../rss/articleFeedRouteHandler';

export async function handleDiagnosticsGet(request: Request): Promise<NextResponse> {
    const denied = requireDiagnosticsAuth(request, {bucket: 'diag', max: 30});
    if (denied) return denied;

    return NextResponse.json(
        {
            now: Date.now(),
            events: getRecentDiagnosticEvents(),
            memory: process.memoryUsage(),
            // Folded in from the separate /api/diagnostics/library-state route,
            // which existed only to expose this one extra field.
            markdownToHtml: getMarkdownToHtmlState(),
            schedulers: {
                audioFeed: getAudioFeedRuntimeState(),
                articleFeed: getArticleFeedSchedulerState(),
            },
        },
        {headers: {'Cache-Control': 'no-store'}},
    );
}
