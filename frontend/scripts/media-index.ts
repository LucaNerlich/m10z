/**
 * Media index generator.
 *
 * Pages `media_list_assets` over the Strapi MCP endpoint and writes
 * `public/media-index.json`, the `url → {alt, caption}` snapshot the frontend
 * uses to enrich inline Markdown images (issue #724 follow-up). It performs no
 * AI calls — it only mirrors the current Media Library metadata.
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
    type MediaAssetInput,
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

async function main(): Promise<void> {
    const config = resolveMcpConfig({useLocal});
    const client = createMcpClient(config);
    console.log(`Fetching media assets from ${config.endpoint} …`);

    const assets = await client.listAll<MediaAssetInput>('media_list_assets', {
        mime: 'image',
        sort: 'name:ASC',
    });
    const index = buildMediaIndex({
        generatedAt: new Date().toISOString(),
        baseUrl: config.origin,
        assets,
    });
    const json = serializeMediaIndex(index);
    // Guard: the frontend must be able to read what we write.
    parseMediaIndex(json);

    const count = Object.keys(index.entries).length;
    console.log(
        `Media index: ${count}/${assets.length} image(s) with alt text or caption (base ${index.baseUrl}).`
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
