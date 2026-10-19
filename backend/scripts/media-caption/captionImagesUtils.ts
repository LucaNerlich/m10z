/**
 * Pure helpers for the media caption/alt-text pipeline (`caption-images.ts`,
 * issue #724).
 *
 * Everything here is side-effect free (no network, no filesystem writes) so it
 * can be unit tested without booting Strapi, a database or the AI gateway.
 */

import path from 'node:path';

export type CaptionArgs = {
    apply: boolean;
    force: boolean;
    local: boolean;
    limit: number | null;
    model: string | null;
    batchSize: number;
    pageSize: number;
    concurrency: number;
    out: string | null;
};

/** The narrow subset of a Strapi Media Library asset this pipeline cares about. */
export type McpAsset = {
    id: number;
    name?: string | null;
    url?: string | null;
    mime?: string | null;
    alternativeText?: string | null;
    caption?: string | null;
    width?: number | null;
    height?: number | null;
};

/** A single model result, already validated. */
export type CaptionProposal = {
    id: number;
    alternativeText: string;
    caption: string;
};

/** The fields that will actually be written for one asset. */
export type AssetUpdate = {
    alternativeText?: string;
    caption?: string;
};

export const DEFAULT_MODEL = 'opencode-go/deepseek-v4.1-flash';
export const DEFAULT_BATCH_SIZE = 4;
export const DEFAULT_PAGE_SIZE = 100;
export const DEFAULT_CONCURRENCY = 2;

/**
 * Raster image formats the vision model can meaningfully describe. SVG is
 * excluded (vector, no visual "content" for a caption) and so is every
 * non-image MIME type.
 */
const RASTER_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
]);

function parsePositiveInt(value: string, flag: string): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`${flag} expects a positive integer, got "${value}"`);
    }
    return parsed;
}

/**
 * Parses the CLI arguments of `caption-images.ts`. Unknown arguments and
 * missing values throw so a typo cannot silently change the run's scope.
 */
export function parseArgs(argv: string[]): CaptionArgs {
    const args: CaptionArgs = {
        apply: false,
        force: false,
        local: false,
        limit: null,
        model: null,
        batchSize: DEFAULT_BATCH_SIZE,
        pageSize: DEFAULT_PAGE_SIZE,
        concurrency: DEFAULT_CONCURRENCY,
        out: null,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const raw = argv[index];
        // Tolerate a bare `--` separator (some package-manager invocations keep it).
        if (raw === '--') continue;
        if (!raw.startsWith('--'))
            throw new Error(`Unexpected positional argument: ${raw}`);

        const equals = raw.indexOf('=');
        const flag = equals === -1 ? raw : raw.slice(0, equals);
        const inline = equals === -1 ? null : raw.slice(equals + 1);

        const takeValue = (): string => {
            if (inline !== null) return inline;
            const value = argv[index + 1];
            if (value === undefined || value.startsWith('--')) {
                throw new Error(`Missing value for ${flag}`);
            }
            index += 1;
            return value;
        };

        switch (flag) {
            case '--apply':
                args.apply = true;
                break;
            case '--dry-run':
                args.apply = false;
                break;
            case '--force':
                args.force = true;
                break;
            case '--local':
                args.local = true;
                break;
            case '--limit':
                args.limit = parsePositiveInt(takeValue(), flag);
                break;
            case '--model':
                args.model = takeValue();
                break;
            case '--batch-size':
                args.batchSize = parsePositiveInt(takeValue(), flag);
                break;
            case '--page-size':
                args.pageSize = parsePositiveInt(takeValue(), flag);
                break;
            case '--concurrency':
                args.concurrency = parsePositiveInt(takeValue(), flag);
                break;
            case '--out':
                args.out = takeValue();
                break;
            default:
                throw new Error(`Unknown argument: ${flag}`);
        }
    }

    return args;
}

/** True when a field is missing, null, or only whitespace. */
export function isBlank(value: unknown): boolean {
    return (
        value === null ||
        value === undefined ||
        (typeof value === 'string' && value.trim() === '')
    );
}

/** True for raster image MIME types the vision model can describe. */
export function isRasterImageMime(mime: unknown): boolean {
    if (typeof mime !== 'string') return false;
    const base = mime.split(';')[0].trim().toLowerCase();
    return RASTER_MIME_TYPES.has(base);
}

/**
 * Applies the scope rules: only raster images with a usable URL, only assets
 * missing alt text or caption (unless `force`), capped by `limit`.
 */
export function selectAssets(
    assets: McpAsset[],
    options: {force: boolean; limit: number | null}
): McpAsset[] {
    const selected = assets.filter(
        (asset) =>
            typeof asset.id === 'number' &&
            typeof asset.url === 'string' &&
            asset.url.length > 0 &&
            isRasterImageMime(asset.mime) &&
            (options.force ||
                isBlank(asset.alternativeText) ||
                isBlank(asset.caption))
    );
    return options.limit === null ? selected : selected.slice(0, options.limit);
}

/** Turns a possibly root-relative media URL into an absolute one. */
export function resolveAssetUrl(url: string, origin: string): string {
    if (/^https?:\/\//i.test(url)) return url;
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** The gateway speaks the opencode provider id (`opencode-go/x`) as plain `x`. */
export function toGatewayModelId(model: string): string {
    return model.startsWith('opencode-go/')
        ? model.slice('opencode-go/'.length)
        : model;
}

export const SYSTEM_PROMPT = [
    'Du erzeugst deutsche Bild-Metadaten für den Gaming- und Tech-Blog m10z.de.',
    'Für jedes Bild lieferst du:',
    '- alternativeText: knappe, sachliche Beschreibung für Screenreader, maximal ca. 125 Zeichen.',
    '  Kein "Bild von", kein "Ein Bild zeigt", keine Nennung des Dateinamens.',
    '- caption: ein kurzer, natürlicher Satz, der das Bild einordnet, maximal ca. 140 Zeichen.',
    'Antworte ausschließlich mit JSON in genau dieser Form:',
    '{"results":[{"id":<Zahl>,"alternativeText":"…","caption":"…"}]}',
].join('\n');

export function buildInstructions(count: number): string {
    return [
        `Analysiere die folgenden ${count} Bilder.`,
        'Jedes Bild ist mit einer Zeile "id=…, Dateiname: …" beschriftet, direkt gefolgt vom Bild.',
        'Gib in "results" für jedes Bild genau einen Eintrag mit derselben id zurück.',
    ].join('\n');
}

export function buildAssetLabel(asset: Pick<McpAsset, 'id' | 'name'>): string {
    const name =
        typeof asset.name === 'string' && asset.name.trim() !== ''
            ? asset.name
            : '(ohne Namen)';
    return `id=${asset.id}, Dateiname: ${name}`;
}

/**
 * Extracts the first JSON object from a model reply. Tolerates ```json fences
 * and surrounding prose.
 */
export function extractJsonObject(text: unknown): unknown {
    if (typeof text !== 'string')
        throw new Error('Model response was not text');
    let cleaned = text.trim();
    const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) cleaned = fence[1].trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
        throw new Error('Model response did not contain a JSON object');
    }
    return JSON.parse(cleaned.slice(start, end + 1));
}

/**
 * Validates the model's `results` array. Entries missing an id or with an empty
 * alt/caption are dropped, the caller then retries them individually.
 */
export function parseProposals(raw: unknown): CaptionProposal[] {
    const list = Array.isArray(raw)
        ? raw
        : (raw as {results?: unknown} | null)?.results;
    if (!Array.isArray(list))
        throw new Error('Model response had no "results" array');

    const proposals: CaptionProposal[] = [];
    for (const item of list) {
        if (item === null || typeof item !== 'object') continue;
        const record = item as Record<string, unknown>;
        const id =
            typeof record.id === 'number' ? record.id : Number(record.id);
        const alternativeText =
            typeof record.alternativeText === 'string'
                ? record.alternativeText.trim()
                : '';
        const caption =
            typeof record.caption === 'string' ? record.caption.trim() : '';
        if (!Number.isInteger(id) || alternativeText === '' || caption === '')
            continue;
        proposals.push({id, alternativeText, caption});
    }
    return proposals;
}

/**
 * Decides which fields to write. By default only blank fields are filled;
 * `force` regenerates both.
 */
export function pickUpdates(
    asset: McpAsset,
    proposal: CaptionProposal,
    force: boolean
): AssetUpdate {
    const update: AssetUpdate = {};
    if (force || isBlank(asset.alternativeText))
        update.alternativeText = proposal.alternativeText;
    if (force || isBlank(asset.caption)) update.caption = proposal.caption;
    return update;
}

export type ListPayload<T> = {
    results: T[];
    pageCount: number | null;
    total: number | null;
};

/** Normalises the MCP list payloads (`{results, pagination}` or a bare array). */
export function normalizeListPayload<T>(payload: unknown): ListPayload<T> {
    if (Array.isArray(payload))
        return {results: payload as T[], pageCount: null, total: null};
    const record = (payload ?? {}) as {
        results?: unknown;
        data?: unknown;
        pagination?: {pageCount?: unknown; total?: unknown};
    };
    const results = Array.isArray(record.results)
        ? record.results
        : Array.isArray(record.data)
          ? record.data
          : [];
    const pageCount =
        typeof record.pagination?.pageCount === 'number'
            ? record.pagination.pageCount
            : null;
    const total =
        typeof record.pagination?.total === 'number'
            ? record.pagination.total
            : null;
    return {results: results as T[], pageCount, total};
}

/** Splits an array into fixed-size chunks (last chunk may be smaller). */
export function chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
}

/** Runs `fn` over `items` with at most `limit` concurrent tasks. */
export async function mapPool<T, R>(
    items: T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const results = new Array<R>(items.length);
    let next = 0;
    const workerCount = Math.max(1, Math.min(limit, items.length));
    const workers = Array.from({length: workerCount}, async () => {
        for (;;) {
            const index = next;
            next += 1;
            if (index >= items.length) return;
            results[index] = await fn(items[index], index);
        }
    });
    await Promise.all(workers);
    return results;
}

export type RetryOptions = {
    attempts?: number;
    baseDelayMs?: number;
    /** When it returns false the error is rethrown immediately without another attempt. */
    shouldRetry?: (error: unknown) => boolean;
    onRetry?: (error: unknown, attempt: number) => void;
};

/** Retries `fn` with exponential backoff, rethrowing the last error. */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const attempts = options.attempts ?? 3;
    const baseDelayMs = options.baseDelayMs ?? 500;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt >= attempts) break;
            if (options.shouldRetry && !options.shouldRetry(error)) break;
            options.onRetry?.(error, attempt);
            await new Promise((resolve) =>
                setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1))
            );
        }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Base data directory of the opencode CLI (`$XDG_DATA_HOME` aware). */
export function opencodeDataDir(
    env: Record<string, string | undefined>,
    home: string
): string {
    const dataHome =
        typeof env.XDG_DATA_HOME === 'string' && env.XDG_DATA_HOME.trim() !== ''
            ? env.XDG_DATA_HOME
            : path.join(home, '.local', 'share');
    return path.join(dataHome, 'opencode');
}

/** Path of the opencode CLI auth store, used as a fallback for the API key. */
export function opencodeAuthPath(
    env: Record<string, string | undefined>,
    home: string
): string {
    return path.join(opencodeDataDir(env, home), 'auth.json');
}

/** USD per 1M tokens, keyed by the user-facing (prefixed) model id. */
const MODEL_COSTS: Record<string, {input: number; output: number}> = {
    'opencode-go/deepseek-v4.1-flash': {input: 0.15, output: 0.6},
};

/** Estimated USD cost, or `null` when the model's pricing is unknown. */
export function estimateCost(
    model: string,
    promptTokens: number,
    completionTokens: number
): number | null {
    const cost = MODEL_COSTS[model];
    if (!cost) return null;
    return (
        (promptTokens / 1_000_000) * cost.input +
        (completionTokens / 1_000_000) * cost.output
    );
}

/** Safe message extraction for CLI/console output. */
export function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
