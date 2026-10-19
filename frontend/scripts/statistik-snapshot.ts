/**
 * Statistik snapshot generator (issue #706).
 *
 * Pulls every published article, podcast, author and category from the Strapi
 * MCP endpoint (the same server configured as `strapi-prod` in `.cursor/mcp.json`)
 * and writes the flat, minimal snapshot rendered by `/statistik` to
 * `public/statistik/snapshot.yaml`.
 *
 * Run manually — it is not part of the build:
 *
 *   STRAPI_MCP_ADMIN_TOKEN_PROD=… pnpm run snapshot:statistik
 *   pnpm run snapshot:statistik -- --local        # against http://localhost:1337/mcp
 *   pnpm run snapshot:statistik -- --dry-run      # print a summary, write nothing
 *
 * Overrides: STRAPI_MCP_URL, STRAPI_MCP_TOKEN, STATISTIK_SNAPSHOT_OUT.
 */

import {writeFileAtomic} from './lib/writeFileAtomic';
import path from 'node:path';

import {
    buildStatistikSnapshot,
    parseStatistikSnapshot,
    type RawStrapiContentDoc,
    type RawStrapiNamedDoc,
    serializeStatistikSnapshot,
} from '@/src/lib/statistik/snapshot';

import {createMcpClient, resolveMcpConfig} from './lib/strapiMcp';

const args = new Set(process.argv.slice(2));
const useLocal = args.has('--local');
const dryRun = args.has('--dry-run');

const outFile =
    process.env.STATISTIK_SNAPSHOT_OUT ??
    path.join(__dirname, '..', 'public', 'statistik', 'snapshot.yaml');

async function main(): Promise<void> {
    const config = resolveMcpConfig({useLocal});
    const client = createMcpClient(config);
    console.log(`Fetching published content from ${config.endpoint} …`);

    const published = {status: 'published', sort: 'date:asc'};
    const [articles, podcasts, authors, categories] = await Promise.all([
        client.listAll<RawStrapiContentDoc>('list_article', published),
        client.listAll<RawStrapiContentDoc>('list_podcast', published),
        client.listAll<RawStrapiNamedDoc>('list_author', {status: 'published'}),
        client.listAll<RawStrapiNamedDoc>('list_category', {
            status: 'published',
        }),
    ]);

    const snapshot = buildStatistikSnapshot({
        generatedAt: new Date().toISOString(),
        articles,
        podcasts,
        authors,
        categories,
    });
    const yaml = serializeStatistikSnapshot(snapshot);
    // Guard: the page must be able to read what we write.
    parseStatistikSnapshot(yaml);

    console.log(
        `Snapshot: ${snapshot.articles.length}/${articles.length} Artikel, ` +
            `${snapshot.podcasts.length}/${podcasts.length} Podcasts, ` +
            `${snapshot.authors.length} Autor:innen, ${snapshot.categories.length} Kategorien.`
    );

    if (dryRun) {
        console.log('Dry run — nothing written.');
        return;
    }
    await writeFileAtomic(outFile, yaml);
    console.log(
        `Wrote ${path.relative(process.cwd(), outFile)} (${Buffer.byteLength(yaml)} bytes).`
    );
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
