/**
 * Feed XML golden snapshot.
 *
 * Calls the pure feed generators with deterministic synthetic fixtures and
 * either writes the resulting XML to disk (`--write`) or diffs the bytes
 * against the existing goldens (default).
 *
 * The XML output is the public contract consumed by RSS clients.
 * Refactors must preserve byte-for-byte output.
 */

import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

process.env.STRAPI_URL = 'https://strapi.example.test';
process.env.NEXT_PUBLIC_STRAPI_URL = 'https://strapi.example.test';

import {generateArticleFeedXml, type StrapiArticle, type StrapiArticleFeedSingle} from '@/src/lib/rss/articlefeed';
import {generateAudioFeedXml, type AudioFeedConfig, type StrapiAudioFeedSingle, type StrapiPodcast} from '@/src/lib/rss/audiofeed';

const GOLDEN_DIR = path.join(__dirname, '__feed-goldens__');
const SITE_URL = 'https://m10z.de';

const articleChannel: StrapiArticleFeedSingle = {
    channel: {
        title: 'M10Z Artikel',
        description: 'Mindestens 10 Zeichen — Artikel-Feed.',
        mail: 'm10z@example.test',
        image: {
            url: '/uploads/feed-cover.jpg',
            width: 1400,
            height: 1400,
            mime: 'image/jpeg',
            sizeInBytes: 200_000,
        },
    },
};

const articles: StrapiArticle[] = [
    {
        id: 1,
        slug: 'erstes-spiel-test',
        title: 'Erstes Spiel im Test',
        description: 'Eine ausführliche Besprechung.',
        publishedAt: '2026-04-12T10:30:00.000Z',
        date: null,
        wordCount: 1200,
        content: '## Einleitung\n\nDas ist ein **Test**-Artikel mit etwas *Markdown*.\n\n- Punkt 1\n- Punkt 2',
        cover: {
            url: '/uploads/cover-1.jpg',
            width: 1920,
            height: 1080,
            mime: 'image/jpeg',
            sizeInBytes: 350_000,
            formats: {
                thumbnail: {url: '/uploads/cover-1-thumb.jpg', width: 245, height: 138, mime: 'image/jpeg', sizeInBytes: 20_000},
                small: {url: '/uploads/cover-1-small.jpg', width: 500, height: 281, mime: 'image/jpeg', sizeInBytes: 60_000},
                medium: {url: '/uploads/cover-1-medium.jpg', width: 750, height: 422, mime: 'image/jpeg', sizeInBytes: 120_000},
                large: {url: '/uploads/cover-1-large.jpg', width: 1000, height: 562, mime: 'image/jpeg', sizeInBytes: 200_000},
            },
        },
        banner: null,
        authors: [
            {id: 10, slug: 'autor-eins', title: 'Autor Eins'},
            {id: 11, slug: 'autor-zwei', title: 'Autor Zwei'},
        ],
        categories: [
            {slug: 'spiele', title: 'Spiele', description: 'Über Spiele.'},
        ],
    },
    {
        id: 2,
        slug: 'kein-cover-faellt-zurueck',
        title: 'Artikel ohne Cover',
        description: null,
        publishedAt: '2026-03-01T08:00:00.000Z',
        date: null,
        wordCount: 600,
        content: 'Kein eigenes Cover, kein Description — fällt auf Kategorie zurück.',
        cover: null,
        banner: null,
        authors: [],
        categories: [
            {
                slug: 'allgemein',
                title: 'Allgemein',
                description: 'Allgemeine Beiträge.',
                cover: {url: '/uploads/category-cover.jpg', width: 800, height: 600, mime: 'image/jpeg', sizeInBytes: 100_000},
            },
        ],
    },
    {
        id: 3,
        slug: 'absolute-cover-url',
        title: 'Artikel mit absoluter Cover-URL',
        description: 'Cover ist eine externe URL.',
        publishedAt: '2026-02-10T12:00:00.000Z',
        date: '2026-02-15T00:00:00.000Z',
        wordCount: 300,
        content: 'Inhalt.',
        cover: {url: 'https://cdn.example.test/external-cover.jpg', width: 1200, height: 630, mime: 'image/jpeg', sizeInBytes: 150_000},
        banner: null,
        authors: [],
        categories: [],
    },
];

const audioCfg: AudioFeedConfig = {
    siteUrl: SITE_URL,
    ttlSeconds: 60,
    language: 'de',
    copyright: 'All rights reserved',
    webMaster: 'm10z@example.test',
    authorEmail: 'm10z@example.test',
    itunesAuthor: 'M10Z',
    itunesExplicit: 'false',
    itunesType: 'episodic',
    podcastGuid: 'E9QfcR8TYeotS5ceJLmn',
};

const audioChannel: StrapiAudioFeedSingle = {
    channel: {
        title: 'M10Z Podcast',
        description: 'Mindestens 10 Zeichen — Podcast-Feed.',
        mail: 'm10z@example.test',
        image: {
            url: '/uploads/audio-cover.jpg',
            width: 1400,
            height: 1400,
            mime: 'image/jpeg',
            sizeInBytes: 250_000,
        },
    },
    episodeFooter: '## Footer\n\nUnterstütze uns auf [example.test](https://example.test).',
};

const podcasts: StrapiPodcast[] = [
    {
        id: 100,
        slug: 'episode-001',
        title: 'Episode 001',
        description: 'Erste Episode.',
        publishedAt: '2026-04-20T09:00:00.000Z',
        date: null,
        wordCount: 2500,
        duration: 3540,
        shownotes: '## Shownotes\n\nWir reden über *Spiele* und **Technik**.\n\n- Link 1\n- Link 2',
        file: {
            url: '/uploads/episode-001.mp3',
            mime: 'audio/mpeg',
            sizeInBytes: 45_000_000,
        },
        cover: {
            url: '/uploads/episode-001-cover.jpg',
            width: 1400,
            height: 1400,
            mime: 'image/jpeg',
            sizeInBytes: 200_000,
            formats: {
                medium: {url: '/uploads/episode-001-medium.jpg', width: 750, height: 750, mime: 'image/jpeg', sizeInBytes: 80_000},
            },
        },
        banner: null,
        authors: [{id: 10, slug: 'autor-eins', title: 'Autor Eins'}],
        categories: [{slug: 'spiele', title: 'Spiele', description: 'Über Spiele.'}],
    },
    {
        id: 101,
        slug: 'episode-002-keine-shownotes',
        title: 'Episode 002 — keine Shownotes',
        description: 'Beschreibung.',
        publishedAt: '2026-03-15T09:00:00.000Z',
        date: null,
        wordCount: 1800,
        duration: 2700,
        shownotes: null,
        file: {
            url: 'https://cdn.example.test/episode-002.mp3',
            mime: 'audio/mpeg',
            sizeInBytes: 30_000_000,
        },
        cover: null,
        banner: null,
        authors: [],
        categories: [
            {slug: 'allgemein', title: 'Allgemein', description: 'Allgemein.', cover: {url: '/uploads/cat.jpg', mime: 'image/jpeg', width: 800, height: 600}},
        ],
    },
    {
        id: 102,
        slug: 'episode-003-size-in-kb',
        title: 'Episode 003 — Strapi size in KB',
        description: 'Episode mit `size`-Feld in KB statt sizeInBytes.',
        publishedAt: '2026-02-01T09:00:00.000Z',
        date: null,
        wordCount: 1000,
        duration: 1800,
        shownotes: 'Kurze Notizen.',
        file: {
            url: '/uploads/episode-003.mp3',
            mime: 'audio/mpeg',
            size: 15_000,
        },
        cover: null,
        banner: null,
        authors: [],
        categories: [],
    },
];

function sha(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

async function buildArticleSnapshot(): Promise<string> {
    const {xml, etagSeed, lastModified} = generateArticleFeedXml({
        siteUrl: SITE_URL,
        channel: articleChannel.channel,
        articles,
    });
    return [
        `# Article Feed Golden`,
        ``,
        `etagSeed: ${etagSeed}`,
        `lastModified: ${lastModified ? lastModified.toISOString() : 'null'}`,
        `xmlSha256: ${sha(xml)}`,
        ``,
        `--- BEGIN XML ---`,
        xml,
        `--- END XML ---`,
        ``,
    ].join('\n');
}

async function buildAudioSnapshot(): Promise<string> {
    const {xml, etagSeed, lastModified, renderedEpisodeCount} = generateAudioFeedXml({
        cfg: audioCfg,
        channel: audioChannel.channel,
        episodeFooter: audioChannel.episodeFooter,
        episodes: podcasts,
    });
    return [
        `# Audio Feed Golden`,
        ``,
        `etagSeed: ${etagSeed}`,
        `lastModified: ${lastModified ? lastModified.toISOString() : 'null'}`,
        `renderedEpisodeCount: ${renderedEpisodeCount}`,
        `xmlSha256: ${sha(xml)}`,
        ``,
        `--- BEGIN XML ---`,
        xml,
        `--- END XML ---`,
        ``,
    ].join('\n');
}

async function loadGolden(name: string): Promise<string | null> {
    try {
        return await readFile(path.join(GOLDEN_DIR, name), 'utf8');
    } catch {
        return null;
    }
}

async function writeGolden(name: string, content: string): Promise<void> {
    await writeFile(path.join(GOLDEN_DIR, name), content, 'utf8');
}

function diff(actual: string, expected: string): string {
    const a = actual.split('\n');
    const e = expected.split('\n');
    const out: string[] = [];
    const max = Math.max(a.length, e.length);
    let mismatches = 0;
    for (let i = 0; i < max; i++) {
        if (a[i] !== e[i]) {
            mismatches += 1;
            if (mismatches <= 20) {
                out.push(`L${i + 1}:`);
                out.push(`  expected: ${JSON.stringify(e[i] ?? '<EOF>')}`);
                out.push(`  actual:   ${JSON.stringify(a[i] ?? '<EOF>')}`);
            }
        }
    }
    if (mismatches > 20) out.push(`... and ${mismatches - 20} more line(s).`);
    return out.join('\n');
}

async function main() {
    const mode = process.argv[2] === '--write' ? 'write' : 'check';

    const article = await buildArticleSnapshot();
    const audio = await buildAudioSnapshot();

    if (mode === 'write') {
        await writeGolden('article-feed.golden.txt', article);
        await writeGolden('audio-feed.golden.txt', audio);
        console.log('Wrote goldens to', GOLDEN_DIR);
        return;
    }

    let failed = false;

    const articleGolden = await loadGolden('article-feed.golden.txt');
    if (articleGolden === null) {
        console.error('Missing article-feed.golden.txt — run with --write to generate.');
        failed = true;
    } else if (articleGolden !== article) {
        failed = true;
        console.error('Article feed snapshot drift:');
        console.error(diff(article, articleGolden));
    } else {
        console.log('Article feed snapshot OK.');
    }

    const audioGolden = await loadGolden('audio-feed.golden.txt');
    if (audioGolden === null) {
        console.error('Missing audio-feed.golden.txt — run with --write to generate.');
        failed = true;
    } else if (audioGolden !== audio) {
        failed = true;
        console.error('Audio feed snapshot drift:');
        console.error(diff(audio, audioGolden));
    } else {
        console.log('Audio feed snapshot OK.');
    }

    if (failed) process.exit(1);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
