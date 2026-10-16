#!/usr/bin/env node

/**
 * Media caption / alt-text pipeline (issue #724).
 *
 * Enumerates image assets from the Strapi MCP server, asks a vision model on
 * the opencode go gateway for a German `alternativeText` and `caption`, and
 * writes the results back through the `media_update_asset` MCP tool.
 *
 * Dry run by default: nothing is written unless `--apply` is passed. Without
 * `--force` only assets whose alt text or caption is still empty are touched.
 *
 * Usage:
 *   pnpm caption:images                        # dry run, missing alt/caption only
 *   pnpm caption:images -- --limit 10          # cap the number of assets
 *   pnpm caption:images -- --local             # against http://localhost:1337/mcp
 *   pnpm caption:images -- --apply             # write the proposals
 *   pnpm caption:images -- --apply --force     # refresh every image
 *
 * Authentication / overrides (see ../../.env.example and README.md next to this script):
 *   STRAPI_MCP_ADMIN_TOKEN_PROD  Bearer token for https://cms.m10z.de/mcp
 *   STRAPI_MCP_ADMIN_TOKEN_LOCAL Bearer token for --local
 *   STRAPI_MCP_TOKEN             Explicit token override
 *   STRAPI_MCP_URL               Endpoint override
 *   OPENCODE_GO_API_KEY          opencode go key (falls back to the opencode CLI auth store)
 *   CAPTION_MODEL                Model id override
 */

import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {config} from 'dotenv';
import sharp from 'sharp';

import {
    type AssetUpdate,
    buildAssetLabel,
    buildInstructions,
    type CaptionArgs,
    type CaptionProposal,
    chunk,
    DEFAULT_MODEL,
    errorMessage,
    estimateCost,
    extractJsonObject,
    mapPool,
    type McpAsset,
    normalizeListPayload,
    opencodeAuthPath,
    parseArgs,
    parseProposals,
    pickUpdates,
    resolveAssetUrl,
    selectAssets,
    SYSTEM_PROMPT,
    toGatewayModelId,
    withRetry,
} from './captionImagesUtils';
import {
    createMcpTransport,
    type McpConfig,
    type McpTransport,
    resolveMcpConfig,
} from '../../src/shared/contracts/mcp/transport';

config();

const GATEWAY_URL = 'https://opencode.ai/zen/go/v1/chat/completions';
const USER_AGENT = 'm10z-caption-pipeline/1.0 (+https://m10z.de)';
const MAX_TOKENS = 4000;
const IMAGE_MAX_EDGE = 768;
const IMAGE_QUALITY = 72;
const IMAGE_FETCH_CONCURRENCY = 4;
// Stalled requests must not hang the run. The gateway gets a longer budget than
// the MCP/image calls because model inference is the slow step.
const MCP_REQUEST_TIMEOUT_MS = 90_000;
const IMAGE_FETCH_TIMEOUT_MS = 60_000;
const GATEWAY_REQUEST_TIMEOUT_MS = 180_000;
const WRITE_DELAY_MS = 250;
const MCP_MAX_PAGES = 200;

type Usage = {prompt_tokens?: number; completion_tokens?: number};

type RunEntry = {
    asset: McpAsset;
    proposal: CaptionProposal | null;
    update: AssetUpdate | null;
    applied: boolean;
    error: string | null;
};

function log(...args: unknown[]): void {
    console.log('[caption-images]', ...args);
}

function warn(...args: unknown[]): void {
    console.warn('[caption-images] WARN:', ...args);
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------------------------------------------ */
/* MCP client — provided by the shared transport module (see import)    */
/* ------------------------------------------------------------------ */

/** Pages through `media_list_assets` until every `image/*` asset is collected. */
async function listImageAssets(
    transport: McpTransport,
    pageSize: number
): Promise<McpAsset[]> {
    const all: McpAsset[] = [];
    for (let page = 1; page <= MCP_MAX_PAGES; page += 1) {
        const payload = await transport.callTool<unknown>('media_list_assets', {
            page,
            pageSize,
            mime: 'image',
            sort: 'name:ASC',
        });
        const {results, pageCount} = normalizeListPayload<McpAsset>(payload);
        all.push(...results);

        if (results.length === 0) break;
        if (pageCount !== null && page >= pageCount) break;
        if (pageCount === null && results.length < pageSize) break;
        if (page === MCP_MAX_PAGES) {
            throw new Error(
                `media_list_assets: more than ${MCP_MAX_PAGES} pages — aborting`
            );
        }
    }
    return all;
}

/* ------------------------------------------------------------------ */
/* opencode go gateway                                                 */
/* ------------------------------------------------------------------ */

/** Reads the gateway key from the environment, falling back to the opencode CLI store. */
function resolveApiKey(): string | null {
    const fromEnv =
        process.env.OPENCODE_GO_API_KEY ?? process.env.OPENCODE_API_KEY;
    if (typeof fromEnv === 'string' && fromEnv.trim() !== '')
        return fromEnv.trim();

    try {
        const raw = readFileSync(
            opencodeAuthPath(process.env, os.homedir()),
            'utf8'
        );
        const parsed = JSON.parse(raw) as Record<
            string,
            {key?: unknown}
        > | null;
        const key = parsed?.['opencode-go']?.key;
        return typeof key === 'string' && key.trim() !== '' ? key.trim() : null;
    } catch {
        return null;
    }
}

/** Raised when the downloaded bytes cannot be decoded by sharp (corrupt or unsupported codec). */
class ImageDecodeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ImageDecodeError';
    }
}

/** Downloads an image, retrying transient failures. */
async function downloadImageBuffer(url: string): Promise<Buffer> {
    return withRetry(
        async () => {
            const response = await fetch(url, {
                headers: {'User-Agent': USER_AGENT},
                signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
            });
            if (!response.ok)
                throw new Error(
                    `image download failed with HTTP ${response.status}`
                );
            return Buffer.from(await response.arrayBuffer());
        },
        {
            attempts: 3,
            baseDelayMs: 800,
            onRetry: (error, attempt) =>
                warn(
                    `image download attempt ${attempt} failed: ${errorMessage(error)}`
                ),
        }
    );
}

/**
 * Re-encodes an image small so a batch stays cheap. Throws `ImageDecodeError`
 * when sharp cannot read it (e.g. a corrupt or HEVC/AVIF file sharp's build
 * does not support) — such a file will never succeed on retry.
 */
async function encodeImageForModel(buffer: Buffer): Promise<string> {
    try {
        const resized = await sharp(buffer)
            .rotate()
            .resize({
                width: IMAGE_MAX_EDGE,
                height: IMAGE_MAX_EDGE,
                fit: 'inside',
                withoutEnlargement: true,
            })
            .flatten({background: '#ffffff'})
            .jpeg({quality: IMAGE_QUALITY})
            .toBuffer();
        return `data:image/jpeg;base64,${resized.toString('base64')}`;
    } catch (error) {
        throw new ImageDecodeError(
            `undecodable image — skipping (${errorMessage(error)})`
        );
    }
}

/** A target image already downloaded and encoded, ready to be sent to the model. */
type PreparedImage = {asset: McpAsset; dataUrl: string};

async function prepareImage(
    asset: McpAsset,
    origin: string
): Promise<PreparedImage> {
    const url = asset.url;
    if (typeof url !== 'string' || url === '')
        throw new Error('asset has no URL');
    const buffer = await downloadImageBuffer(resolveAssetUrl(url, origin));
    return {asset, dataUrl: await encodeImageForModel(buffer)};
}

type GatewayResult = {
    text: string;
    finishReason: string | null;
    usage: Usage | null;
    requestTokens: number;
};

async function callGateway(input: {
    model: string;
    apiKey: string;
    session: string;
    content: unknown[];
}): Promise<GatewayResult> {
    const response = await fetch(GATEWAY_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${input.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': USER_AGENT,
            'x-opencode-session': input.session,
        },
        body: JSON.stringify({
            model: input.model,
            max_tokens: MAX_TOKENS,
            reasoning_effort: 'minimal',
            messages: [
                {role: 'system', content: SYSTEM_PROMPT},
                {role: 'user', content: input.content},
            ],
        }),
        signal: AbortSignal.timeout(GATEWAY_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
        // Never read or log the gateway response body (it may echo request
        // context); cancel it so the connection can be reused, and keep only
        // the HTTP status in the error.
        const body = response.body;
        if (body) await body.cancel().catch(() => undefined);
        throw new Error(
            `opencode go request failed with HTTP ${response.status}`
        );
    }

    const payload = (await response.json()) as {
        choices?: {finish_reason?: string; message?: {content?: string}}[];
        usage?: Usage;
    };
    const choice = payload.choices?.[0];
    const text = choice?.message?.content;
    if (typeof text !== 'string' || text.trim() === '') {
        throw new Error('opencode go returned an empty response');
    }
    return {
        text,
        finishReason: choice?.finish_reason ?? null,
        usage: payload.usage ?? null,
        requestTokens: payload.usage?.prompt_tokens ?? 0,
    };
}

/* ------------------------------------------------------------------ */
/* Analysis                                                            */
/* ------------------------------------------------------------------ */

type BatchContext = {
    mcp: McpConfig;
    model: string;
    apiKey: string;
    session: string;
    usage: {promptTokens: number; completionTokens: number; requests: number};
};

type AssetFailure = {asset: McpAsset; error: string};

async function analyzeBatch(
    batch: PreparedImage[],
    ctx: BatchContext
): Promise<{proposals: CaptionProposal[]; truncated: boolean}> {
    const content: unknown[] = [
        {type: 'text', text: buildInstructions(batch.length)},
    ];
    for (const {asset, dataUrl} of batch) {
        content.push({type: 'text', text: buildAssetLabel(asset)});
        content.push({type: 'image_url', image_url: {url: dataUrl}});
    }

    const result = await callGateway({
        model: ctx.model,
        apiKey: ctx.apiKey,
        session: ctx.session,
        content,
    });

    ctx.usage.promptTokens += result.usage?.prompt_tokens ?? 0;
    ctx.usage.completionTokens += result.usage?.completion_tokens ?? 0;
    ctx.usage.requests += 1;

    return {
        proposals: parseProposals(extractJsonObject(result.text)),
        truncated: result.finishReason === 'length',
    };
}

/**
 * Analyses a batch, splitting it in half whenever the model output is truncated
 * or unparseable until every asset either has a proposal or is a single-image
 * failure.
 */
async function analyzeWithSplit(
    batch: PreparedImage[],
    ctx: BatchContext
): Promise<{
    proposals: Map<number, CaptionProposal>;
    failures: AssetFailure[];
}> {
    const proposals = new Map<number, CaptionProposal>();
    const failures: AssetFailure[] = [];
    const queue: PreparedImage[][] = [batch];

    while (queue.length > 0) {
        const current = queue.shift();
        if (!current || current.length === 0) continue;

        try {
            const {proposals: batchProposals, truncated} = await analyzeBatch(
                current,
                ctx
            );
            const returned = new Map(
                batchProposals.map((proposal) => [proposal.id, proposal])
            );
            for (const item of current) {
                const proposal = returned.get(item.asset.id);
                if (proposal) proposals.set(item.asset.id, proposal);
            }

            const missing = current.filter(
                (item) => !proposals.has(item.asset.id)
            );
            if (missing.length === 0) continue;
            if (current.length === 1) {
                failures.push({
                    asset: current[0].asset,
                    error: truncated
                        ? 'model output truncated'
                        : 'model returned no entry for this image',
                });
                continue;
            }
            const mid = Math.ceil(missing.length / 2);
            queue.unshift(missing.slice(mid));
            queue.unshift(missing.slice(0, mid));
        } catch (error) {
            if (current.length === 1) {
                failures.push({
                    asset: current[0].asset,
                    error: errorMessage(error),
                });
                continue;
            }
            const mid = Math.ceil(current.length / 2);
            queue.unshift(current.slice(mid));
            queue.unshift(current.slice(0, mid));
        }
    }

    return {proposals, failures};
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

async function writeManifest(
    args: CaptionArgs,
    entries: RunEntry[]
): Promise<void> {
    if (!args.out) return;
    const manifest = {
        generatedAt: new Date().toISOString(),
        dryRun: !args.apply,
        force: args.force,
        entries: entries.map((entry) => ({
            id: entry.asset.id,
            name: entry.asset.name ?? null,
            current: {
                alternativeText: entry.asset.alternativeText ?? null,
                caption: entry.asset.caption ?? null,
            },
            proposed: entry.proposal
                ? {
                      alternativeText: entry.proposal.alternativeText,
                      caption: entry.proposal.caption,
                  }
                : null,
            update: entry.update,
            applied: entry.applied,
            error: entry.error,
        })),
    };
    const outPath = path.resolve(process.cwd(), args.out);
    await writeFile(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    log(`Manifest written to ${path.relative(process.cwd(), outPath)}.`);
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));
    const mcp = resolveMcpConfig({useLocal: args.local});
    const {endpoint, origin} = mcp;
    const transport = createMcpTransport(mcp, {
        timeoutMs: MCP_REQUEST_TIMEOUT_MS,
        retry: {
            attempts: 3,
            baseDelayMs: 700,
            onRetry: (error, attempt) =>
                warn(`MCP call attempt ${attempt} failed: ${errorMessage(error)}`),
        },
    });

    const model = args.model ?? process.env.CAPTION_MODEL ?? DEFAULT_MODEL;
    const apiKey = resolveApiKey();
    if (!apiKey) {
        throw new Error(
            'Missing opencode go key. Set OPENCODE_GO_API_KEY or sign in with the opencode CLI.'
        );
    }

    log(`MCP endpoint: ${endpoint}`);
    log(
        `Model: ${model} (${args.force ? 'force: all images' : 'only images missing alt text or caption'})`
    );
    log(
        args.apply
            ? 'Mode: APPLY — metadata will be written.'
            : 'Mode: DRY RUN — nothing will be written.'
    );

    const assets = await listImageAssets(transport, args.pageSize);
    log(`Media library: ${assets.length} image asset(s).`);

    const inScope = selectAssets(assets, {force: args.force, limit: null});
    const targets =
        args.limit === null ? inScope : inScope.slice(0, args.limit);
    if (targets.length === 0) {
        log('Nothing to do — no images match the current scope.');
        return;
    }
    log(
        `In scope: ${inScope.length} image(s); selected ${targets.length}; batches of ${args.batchSize}.`
    );

    const ctx: BatchContext = {
        mcp,
        model: toGatewayModelId(model),
        apiKey,
        session: randomUUID(),
        usage: {promptTokens: 0, completionTokens: 0, requests: 0},
    };

    // Download + encode every target first, so one undecodable image is skipped
    // without forcing the model to re-analyse (and re-download) its whole batch.
    type PrepareOutcome = {
        asset: McpAsset;
        prepared?: PreparedImage;
        error?: string;
    };
    const outcomes = await mapPool<McpAsset, PrepareOutcome>(
        targets,
        IMAGE_FETCH_CONCURRENCY,
        async (asset) => {
            try {
                return {asset, prepared: await prepareImage(asset, origin)};
            } catch (error) {
                return {asset, error: errorMessage(error)};
            }
        }
    );

    const images: PreparedImage[] = [];
    const failures: AssetFailure[] = [];
    for (const outcome of outcomes) {
        if (outcome.prepared) images.push(outcome.prepared);
        else
            failures.push({
                asset: outcome.asset,
                error: outcome.error ?? 'unknown error',
            });
    }

    const proposals = new Map<number, CaptionProposal>();
    if (images.length > 0) {
        const batchResults = await mapPool(
            chunk(images, args.batchSize),
            args.concurrency,
            (batch) => analyzeWithSplit(batch, ctx)
        );
        for (const result of batchResults) {
            for (const [id, proposal] of result.proposals)
                proposals.set(id, proposal);
            failures.push(...result.failures);
        }
    }

    const failureReasons = new Map(
        failures.map((failure) => [failure.asset.id, failure.error])
    );

    const entries: RunEntry[] = targets.map((asset) => {
        const proposal = proposals.get(asset.id) ?? null;
        return {
            asset,
            proposal,
            update: proposal ? pickUpdates(asset, proposal, args.force) : null,
            applied: false,
            error: null,
        };
    });

    console.log('');
    for (const entry of entries) {
        const label = `${entry.asset.id} | ${entry.asset.name ?? '(ohne Namen)'}`;
        if (!entry.proposal) {
            log(
                `${label}\n    ✗ ${failureReasons.get(entry.asset.id) ?? 'keine Vorschläge'}`
            );
            continue;
        }
        const current = `alt=${JSON.stringify(entry.asset.alternativeText ?? '')} caption=${JSON.stringify(
            entry.asset.caption ?? ''
        )}`;
        const proposed = `alt=${JSON.stringify(entry.proposal.alternativeText)} caption=${JSON.stringify(
            entry.proposal.caption
        )}`;
        log(`${label}\n    ${current}\n    → ${proposed}`);
    }
    console.log('');

    let applied = 0;
    let writeFailures = 0;
    if (args.apply) {
        for (const entry of entries) {
            if (!entry.update || Object.keys(entry.update).length === 0)
                continue;
            try {
                await transport.callTool('media_update_asset', {
                    id: entry.asset.id,
                    ...entry.update,
                });
                entry.applied = true;
                applied += 1;
            } catch (error) {
                entry.error = errorMessage(error);
                writeFailures += 1;
                warn(
                    `update failed for asset ${entry.asset.id}: ${entry.error}`
                );
            }
            await sleep(WRITE_DELAY_MS);
        }
    }

    const estimatedCost = estimateCost(
        model,
        ctx.usage.promptTokens,
        ctx.usage.completionTokens
    );
    log(
        `Summary: ${entries.length} target(s), ${proposals.size} proposal(s), ` +
            `${failures.length} failure(s)` +
            (args.apply
                ? `, ${applied} updated, ${writeFailures} write failure(s)`
                : ', 0 written (dry run)') +
            '.'
    );
    log(
        `Model calls: ${ctx.usage.requests}; tokens: ${ctx.usage.promptTokens} in / ` +
            `${ctx.usage.completionTokens} out` +
            (estimatedCost === null ? '.' : ` (~$${estimatedCost.toFixed(4)}).`)
    );
    if (!args.apply) {
        log(
            'Re-run with --apply to write these values (add --force to refresh every image).'
        );
    }
    log(
        'Note: Media Library metadata changes bypass the document cache invalidation —'
    );
    log(
        '      new alt text/captions surface after the tag TTL (≤3600s) or the next publish.'
    );

    await writeManifest(args, entries);

    if (failures.length > 0 || writeFailures > 0) {
        process.exitCode = 1;
    }
}

main().catch((error: unknown) => {
    console.error('[caption-images] ERROR:', errorMessage(error));
    process.exit(1);
});
