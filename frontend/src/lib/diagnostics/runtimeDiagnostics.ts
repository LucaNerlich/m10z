export type DiagnosticEvent = {
    ts: number; // epoch ms
    kind: 'fetch' | 'route';
    name: string;
    ok: boolean;
    durationMs: number;
    detail?: Record<string, unknown>;
};

const MAX_EVENTS = 200;
const events: DiagnosticEvent[] = [];

function pushEvent(ev: DiagnosticEvent) {
    events.push(ev);
    if (events.length > MAX_EVENTS) {
        events.splice(0, events.length - MAX_EVENTS);
    }
}

export function recordDiagnosticEvent(ev: DiagnosticEvent) {
    // Keep this extremely cheap; never throw.
    try {
        pushEvent(ev);
    } catch {
        // ignore
    }
}

export function getRecentDiagnosticEvents() {
    // Return a shallow copy to avoid external mutation.
    return events.slice();
}


