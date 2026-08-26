/**
 * JSON-serializable value tree for event detail payloads. `undefined` is
 * tolerated because several events record optional numeric fields (e.g.
 * `bytesRead`); the diagnostics route serializes events with
 * `JSON.stringify`, which drops `undefined` properties.
 */
type DiagnosticDetailValue =
    | string
    | number
    | boolean
    | null
    | undefined
    | DiagnosticDetailValue[]
    | {[key: string]: DiagnosticDetailValue};

export type DiagnosticEvent = {
    ts: number; // epoch ms
    kind: 'fetch' | 'route';
    name: string;
    ok: boolean;
    durationMs: number;
    /**
     * Optional event-specific detail payload.
     *
     * This may include memory-related numeric fields (in MB) such as:
     * - `memoryUsedMB`: heap used at the end of an operation (derived from `process.memoryUsage().heapUsed`).
     * - `memoryDeltaMB`: heapUsed delta across an operation (end - start).
     */
    detail?: Record<string, DiagnosticDetailValue>;
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
    // Bounded in-memory append; cannot throw.
    pushEvent(ev);
}

export function getRecentDiagnosticEvents() {
    // Return a shallow copy to avoid external mutation.
    return events.slice();
}


