/**
 * Shared recovery logic for stale-build chunk errors (see `isStaleChunkError`).
 *
 * A tab that loaded before a deployment — or an HTML response that was served
 * by a different container than its JS chunks during a rolling update — can
 * reference chunks that no longer exist. Only a full reload against the
 * current deployment recovers.
 *
 * The reload is guarded by a timestamp in sessionStorage: it is allowed again
 * once the cooldown has elapsed, so a later deployment in the same tab session
 * still recovers automatically, while a reload that does not help (the error
 * reappears immediately) cannot loop.
 */

import {STALE_CHUNK_ERROR_SIGNATURES} from '@/src/lib/errors';

export const STALE_CHUNK_RELOAD_KEY = 'm10z-stale-chunk-reload';
export const STALE_CHUNK_RELOAD_COOLDOWN_MS = 30_000;
/** Window property set once a recovery reload is in flight (dedupes triggers). */
export const STALE_CHUNK_RELOADING_FLAG = '__m10zStaleChunkReloading';

type ReloadStorage = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * Decides whether a recovery reload may happen now and, if so, records it.
 *
 * Returns false (never reload) when storage is unavailable, since there is no
 * way to guard against a reload loop without it.
 */
export function claimStaleChunkReload(
    storage: ReloadStorage | null | undefined,
    now: number = Date.now()
): boolean {
    if (!storage) return false;

    try {
        const last = Number(storage.getItem(STALE_CHUNK_RELOAD_KEY));
        const elapsed = now - last;
        // Older builds stored '1' (effectively epoch), which counts as expired.
        if (last > 0 && elapsed >= 0 && elapsed < STALE_CHUNK_RELOAD_COOLDOWN_MS) {
            return false;
        }
        storage.setItem(STALE_CHUNK_RELOAD_KEY, String(now));
        return true;
    } catch {
        return false;
    }
}

function getSessionStorage(): ReloadStorage | null {
    try {
        return window.sessionStorage;
    } catch {
        return null;
    }
}

/**
 * Performs a guarded full reload in the browser.
 *
 * @returns true if a reload is (already) in flight, false if the guard blocked it
 */
export function reloadForStaleChunk(): boolean {
    if (typeof window === 'undefined') return false;
    const flags = window as unknown as Record<string, unknown>;
    if (flags[STALE_CHUNK_RELOADING_FLAG] === true) return true;
    if (!claimStaleChunkReload(getSessionStorage())) return false;
    flags[STALE_CHUNK_RELOADING_FLAG] = true;
    window.location.reload();
    return true;
}

export type StaleChunkListenerConfig = {
    key: string;
    cooldownMs: number;
    flag: string;
    signatures: readonly string[];
};

type ListenerWindow = {
    addEventListener: (type: string, listener: (event: unknown) => void, capture?: boolean) => void;
    sessionStorage: ReloadStorage;
    location: {reload: () => void};
    document: {readyState: string};
};

/**
 * Installs global listeners that reload the page on stale-chunk failures that
 * never reach a React error boundary:
 * - `unhandledrejection` with a chunk-load error (lazy `import()` outside render)
 * - failed `/_next/static/` script or stylesheet loads during the initial page
 *   load (HTML from one build, chunks missing — the page would stay
 *   un-hydrated and non-interactive)
 *
 * IMPORTANT: this function is serialized with `Function.prototype.toString()`
 * into an inline `<head>` script (see `getStaleChunkListenerScript`) so it runs
 * before any Next.js chunk. It must be self-contained: no imports, closures or
 * helpers from outer scope — everything comes in via `config`. Mirrors
 * `claimStaleChunkReload` / `isStaleChunkError`; keep them in sync.
 */
export function installStaleChunkReloadListener(win: ListenerWindow, config: StaleChunkListenerConfig): void {
    const flags = win as unknown as Record<string, unknown>;

    function matches(value: unknown): boolean {
        if (!value) return false;
        let message = '';
        if (typeof value === 'string') {
            message = value;
        } else if (typeof value === 'object') {
            const candidate = value as {name?: unknown; message?: unknown};
            if (candidate.name === 'ChunkLoadError') return true;
            if (typeof candidate.message === 'string') message = candidate.message;
        }
        const text = message.toLowerCase();
        for (let i = 0; i < config.signatures.length; i++) {
            if (text.indexOf(config.signatures[i]) !== -1) return true;
        }
        return false;
    }

    function reload(): void {
        if (flags[config.flag] === true) return;
        try {
            const now = Date.now();
            const last = Number(win.sessionStorage.getItem(config.key));
            const elapsed = now - last;
            if (last > 0 && elapsed >= 0 && elapsed < config.cooldownMs) return;
            win.sessionStorage.setItem(config.key, String(now));
        } catch {
            return;
        }
        flags[config.flag] = true;
        win.location.reload();
    }

    win.addEventListener('unhandledrejection', (event) => {
        if (matches((event as {reason?: unknown}).reason)) reload();
    });

    win.addEventListener(
        'error',
        (rawEvent) => {
            const event = rawEvent as {target?: unknown; error?: unknown; message?: unknown};
            const target = event.target as {tagName?: unknown; src?: unknown; href?: unknown; rel?: unknown} | null;
            if (target && (target as unknown) !== win && typeof target.tagName === 'string') {
                // Resource load failures (they do not bubble; seen in capture phase).
                // Only during the initial load: later chunk loads reject and are
                // handled by the error boundary or the unhandledrejection path.
                if (win.document.readyState === 'complete') return;
                const isScript = target.tagName === 'SCRIPT';
                const isStylesheet = target.tagName === 'LINK' && target.rel === 'stylesheet';
                const url = String((isScript ? target.src : target.href) ?? '');
                if ((isScript || isStylesheet) && url.indexOf('/_next/static/') !== -1) reload();
                return;
            }
            if (matches(event.error) || matches(event.message)) reload();
        },
        true
    );
}

/**
 * Returns the inline script source that installs the listener as early as
 * possible (before Next.js chunks run). Rendered by the root layout.
 */
export function getStaleChunkListenerScript(): string {
    const config: StaleChunkListenerConfig = {
        key: STALE_CHUNK_RELOAD_KEY,
        cooldownMs: STALE_CHUNK_RELOAD_COOLDOWN_MS,
        flag: STALE_CHUNK_RELOADING_FLAG,
        signatures: STALE_CHUNK_ERROR_SIGNATURES,
    };
    // JSON.stringify output is safe inside <script> for these constant values;
    // escape '<' defensively so the payload can never close the tag.
    const serializedConfig = JSON.stringify(config).replace(/</g, '\\u003c');
    return `try{(${installStaleChunkReloadListener.toString()})(window,${serializedConfig})}catch(e){}`;
}
