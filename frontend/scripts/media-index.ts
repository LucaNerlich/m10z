/**
 * Media index generator.
 *
 * Pages `media_list_assets` over the Strapi MCP endpoint and writes
 * `public/media-index.json`, the `url → {alt, caption, blurhash}` snapshot the
 * frontend uses to enrich inline Markdown images (issue #724 follow-up). The
 * upload content API supplies the blurhash placeholders, which the MCP asset
 * listing does not expose. It performs no AI calls — it only mirrors the
 * current Media Library metadata.
 *
 *   STRAPI_MCP_ADMIN_TOKEN_PROD=… pnpm run media:index
 *   pnpm run media:index -- --local      # against http://localhost:1337/mcp
 *   pnpm run media:index -- --dry-run    # print a summary, write nothing
 *
 * Overrides: STRAPI_MCP_URL, STRAPI_MCP_TOKEN, MEDIA_INDEX_OUT.
 */

import {writeFileAtomic} from './lib/writeFileAtomic';
import path from 'node:path';

import {
    buildMediaIndex,
    collectMediaBlurhashes,
    type MediaAssetInput,
    type MediaUploadInput,
    parseMediaIndex,
    serializeMediaIndex,
} from '@/src/lib/media/mediaIndex';

import {createMcpClient, resolveMcpConfig} from './lib/strapiMcp';

const args = new Set(process.argv.slice(2));
const useLocal = args.has('--local');
const dryRun = args.has('--dry-run');

const outFile =
    process.env.MEDIA_INDEX_OUT ??
    path.join(__dirname, '..', 'public', 'media-index.json');

const UPLOAD_QUERY = [
    'filters[blurhash][$notNull]=true',
    'fields[0]=url',
    'fields[1]=blurhash',
].join('&');

/**
 * Fetch every upload that carries a blur placeholder.
 *
 * Strapi's upload content API returns the whole collection and ignores
 * pagination, so one filtered request is enough (~350 KB in production). The
 * endpoint is public (`plugin::upload.content-api.find`), so no token is sent.
 */
async function fetchMediaUploads(origin: string): Promise<MediaUploadInput[]> {
    const response = await fetch(`${origin}/api/upload/files?${UPLOAD_QUERY}`);
    if (!response.ok) {
        throw new Error(
            `Media Library upload request failed with HTTP ${response.status}`
        );
    }
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
        throw new Error('Media Library upload response was not an array');
    }
    return payload.filter(
        (item): item is MediaUploadInput =>
            typeof item === 'object' && item !== null
    );
}

async function main(): Promise<void> {
    const config = resolveMcpConfig({useLocal});
    const client = createMcpClient(config);
    console.log(`Fetching media assets from ${config.endpoint} …`);

    const [assets, uploads] = await Promise.all([
        client.listAll<MediaAssetInput>('media_list_assets', {
            mime: 'image',
            sort: 'name:ASC',
        }),
        fetchMediaUploads(config.origin),
    ]);
    const index = buildMediaIndex({
        generatedAt: new Date().toISOString(),
        baseUrl: config.origin,
        assets,
        blurhashes: collectMediaBlurhashes(uploads, config.origin),
    });
    const json = serializeMediaIndex(index);
    // Guard: the frontend must be able to read what we write.
    parseMediaIndex(json);

    const entries = Object.values(index.entries);
    const blurhashCount = entries.filter((entry) => entry.blurhash).length;
    console.log(
        `Media index: ${entries.length}/${assets.length} image(s) with alt text, caption or blurhash (${blurhashCount} with blurhash, base ${index.baseUrl}).`
    );

    if (dryRun) {
        console.log('Dry run — nothing written.');
        return;
    }
    await writeFileAtomic(outFile, json);
    console.log(
        `Wrote ${path.relative(process.cwd(), outFile)} (${Buffer.byteLength(json)} bytes).`
    );
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
