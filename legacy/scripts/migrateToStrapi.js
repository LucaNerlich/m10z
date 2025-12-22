/**
 * m10z -> Strapi migration helper (dry-run by default).
 *
 * This script is intended to be run manually (NOT in CI).
 *
 * Features:
 * - Imports Authors from `blog/authors.yml` into Strapi `author`
 * - Imports Podcast episodes from `static/audiofeed/episodes/*.md` into Strapi `podcast`
 * - Creates Categories derived from podcast MP3 URL path segment (e.g. Pixelplausch)
 * - Uploads media (cover/banner images + mp3) into Strapi uploads (self-hosting)
 * - Resumable via a local state file (`.migration-state.json`)
 *
 * Security:
 * - SSRF protections: strict hostname allowlist and https-only by default
 * - Size/timeouts: configurable caps for downloads
 *
 * Usage:
 *   STRAPI_URL=http://localhost:1337 STRAPI_API_TOKEN=... node scripts/migrateToStrapi.js --podcasts --authors --apply
 *
 * Flags:
 *   --apply        Actually write to Strapi (otherwise dry-run)
 *   --authors      Import authors
 *   --podcasts     Import podcasts (episodes)
 *   --limit N      Limit number of items per import
 *   --reset        Ignore existing state file (start fresh)
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const yaml = require('js-yaml');
const FormData = require('form-data');

const ROOT = path.join(__dirname, '..');
const AUTHORS_YML = path.join(ROOT, 'blog', 'authors.yml');
const EPISODES_DIR = path.join(ROOT, 'static', 'audiofeed', 'episodes');
const DEFAULT_COVER = path.join(ROOT, 'static', 'img', 'formate', 'cover', 'm10z.jpg');
const DEFAULT_BANNER = path.join(ROOT, 'static', 'img', 'formate', 'banner', 'm10z-podcast.jpg');
const STATE_FILE = path.join(ROOT, '.migration-state.json');

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const DO_AUTHORS = argv.includes('--authors');
const DO_PODCASTS = argv.includes('--podcasts');
const RESET = argv.includes('--reset');
const LIMIT = (() => {
  const idx = argv.findIndex((a) => a === '--limit');
  if (idx === -1) return null;
  const raw = argv[idx + 1];
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
})();

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

function getEnv(name, fallback) {
  return process.env[name] ?? fallback;
}

function log(...args) {
  console.log('[migrateToStrapi]', ...args);
}

function readState() {
  if (RESET) return { uploads: {}, authors: {}, categories: {}, podcasts: {} };
  if (!fs.existsSync(STATE_FILE)) return { uploads: {}, authors: {}, categories: {}, podcasts: {} };
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function toSlug(input) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function episodeFilenameToSlug(filename) {
  return filename.replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-/, '').replace(/\.md$/, '');
}

function getSeconds(time) {
  if (typeof time === 'number') return time;
  if (typeof time !== 'string') return 0;
  const parts = time.split(':').map((p) => p.trim());
  if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  return parseInt(parts[0], 10);
}

function safeUrl(urlStr) {
  const u = new URL(urlStr);

  const allowHttp = getEnv('MIGRATION_ALLOW_HTTP', 'false') === 'true';
  if (!allowHttp && u.protocol !== 'https:') {
    throw new Error(`Blocked non-https URL: ${urlStr}`);
  }

  const allowedHosts = (getEnv('MIGRATION_ALLOWED_HOSTS', 'm10z.picnotes.de,m10z.adrilaida.de,raw.githubusercontent.com') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!allowedHosts.includes(u.hostname)) {
    throw new Error(`Blocked host (SSRF protection): ${u.hostname}`);
  }

  return u;
}

async function fetchWithLimits(urlStr, { timeoutMs, maxBytes }) {
  const u = safeUrl(urlStr);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  const res = await fetch(u, { signal: ctrl.signal });
  clearTimeout(t);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText} (${urlStr})`);

  const arr = await res.arrayBuffer();
  const buf = Buffer.from(arr);
  if (buf.length > maxBytes) throw new Error(`Download too large (${buf.length} bytes): ${urlStr}`);

  return { buf, contentType: res.headers.get('content-type') || 'application/octet-stream' };
}

function strapiUrlJoin(base, p) {
  return new URL(p, base).toString();
}

async function strapiRequestJson(method, apiPath, body) {
  const base = mustGetEnv('STRAPI_URL').replace(/\/+$/, '');
  const token = mustGetEnv('STRAPI_API_TOKEN');

  const url = strapiUrlJoin(base, apiPath);
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Strapi ${method} ${apiPath} failed: ${res.status} ${res.statusText} ${text}`);
  }

  return await res.json();
}

async function strapiUploadFile({ filename, buffer, contentType }) {
  const base = mustGetEnv('STRAPI_URL').replace(/\/+$/, '');
  const token = mustGetEnv('STRAPI_API_TOKEN');
  const url = strapiUrlJoin(base, '/api/upload');

  const form = new FormData();
  form.append('files', buffer, { filename, contentType });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Strapi upload failed: ${res.status} ${res.statusText} ${text}`);
  }

  const json = await res.json();
  // Strapi upload returns an array of uploaded files.
  if (!Array.isArray(json) || !json[0] || typeof json[0].id !== 'number') {
    throw new Error('Unexpected Strapi upload response');
  }
  return json[0];
}

async function ensureCategoryByTitle(state, title) {
  const slug = toSlug(title);
  if (state.categories[slug]) return state.categories[slug];

  if (!APPLY) {
    log(`[dry-run] create category ${title} (${slug})`);
    const fakeId = -1;
    state.categories[slug] = { id: fakeId, slug };
    return state.categories[slug];
  }

  // Try find existing
  const existing = await strapiRequestJson('GET', `/api/categories?filters[slug][$eq]=${encodeURIComponent(slug)}&pagination[pageSize]=1&populate=*`);
  const found = existing?.data?.[0];
  if (found?.id) {
    state.categories[slug] = { id: found.id, slug };
    return state.categories[slug];
  }

  // Category uses BaseContent with required cover+banner; upload defaults.
  const coverUpload = await uploadLocalOnce(state, DEFAULT_COVER);
  const bannerUpload = await uploadLocalOnce(state, DEFAULT_BANNER);

  const created = await strapiRequestJson('POST', '/api/categories', {
    data: {
      slug,
      base: {
        title,
        description: '',
        cover: coverUpload.id,
        banner: bannerUpload.id,
      },
    },
  });

  state.categories[slug] = { id: created.data.id, slug };
  return state.categories[slug];
}

async function uploadLocalOnce(state, filePath) {
  const key = `file:${path.relative(ROOT, filePath)}`;
  if (state.uploads[key]) return state.uploads[key];

  const filename = path.basename(filePath);
  const buffer = fs.readFileSync(filePath);
  const contentType = filename.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream';

  if (!APPLY) {
    log(`[dry-run] upload local ${filename}`);
    state.uploads[key] = { id: -1, url: filename };
    return state.uploads[key];
  }

  const uploaded = await strapiUploadFile({ filename, buffer, contentType });
  state.uploads[key] = { id: uploaded.id, url: uploaded.url };
  return state.uploads[key];
}

async function uploadRemoteOnce(state, urlStr, kind) {
  const key = `${kind}:${urlStr}`;
  if (state.uploads[key]) return state.uploads[key];

  const timeoutMs = parseInt(getEnv('MIGRATION_TIMEOUT_MS', '60000'), 10);
  const maxBytes = parseInt(getEnv('MIGRATION_MAX_BYTES', String(1024 * 1024 * 50)), 10); // default 50MB

  if (!APPLY) {
    log(`[dry-run] download+upload ${urlStr}`);
    state.uploads[key] = { id: -1, url: urlStr };
    return state.uploads[key];
  }

  const { buf, contentType } = await fetchWithLimits(urlStr, { timeoutMs, maxBytes });
  const filename = path.basename(new URL(urlStr).pathname) || `${kind}.bin`;
  const uploaded = await strapiUploadFile({ filename, buffer: buf, contentType });
  state.uploads[key] = { id: uploaded.id, url: uploaded.url };
  return state.uploads[key];
}

async function importAuthors(state) {
  if (!fs.existsSync(AUTHORS_YML)) {
    log('No authors.yml found, skipping');
    return;
  }

  const raw = fs.readFileSync(AUTHORS_YML, 'utf8');
  const authors = yaml.load(raw);
  if (!authors || typeof authors !== 'object') {
    throw new Error('authors.yml parse failed');
  }

  const entries = Object.entries(authors);
  const sliced = LIMIT ? entries.slice(0, LIMIT) : entries;

  for (const [key, a] of sliced) {
    const slug = toSlug(key);
    if (state.authors[slug]) continue;

    const name = a?.name || key;
    const description = a?.description || '';
    const imageUrl = a?.image_url || null;

    if (!APPLY) {
      log(`[dry-run] create author ${name} (${slug})`);
      state.authors[slug] = { id: -1, slug };
      continue;
    }

    const existing = await strapiRequestJson(
      'GET',
      `/api/authors?filters[slug][$eq]=${encodeURIComponent(slug)}&pagination[pageSize]=1&populate=*`
    );
    const found = existing?.data?.[0];
    if (found?.id) {
      state.authors[slug] = { id: found.id, slug };
      continue;
    }

    const cover = imageUrl
      ? await uploadRemoteOnce(state, imageUrl, 'author-image')
      : await uploadLocalOnce(state, DEFAULT_COVER);
    const banner = await uploadLocalOnce(state, DEFAULT_BANNER);

    const created = await strapiRequestJson('POST', '/api/authors', {
      data: {
        slug,
        base: {
          title: name,
          description,
          cover: cover.id,
          banner: banner.id,
        },
      },
    });

    state.authors[slug] = { id: created.data.id, slug };
    log(`created author ${name} (${slug})`);
  }
}

async function importPodcasts(state) {
  if (!fs.existsSync(EPISODES_DIR)) {
    throw new Error(`Missing episodes dir: ${EPISODES_DIR}`);
  }

  const files = fs
    .readdirSync(EPISODES_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort(); // oldest -> newest (stable)

  const sliced = LIMIT ? files.slice(0, LIMIT) : files;

  for (const filename of sliced) {
    const slug = episodeFilenameToSlug(filename);
    if (state.podcasts[slug]) continue;

    const fullPath = path.join(EPISODES_DIR, filename);
    const raw = fs.readFileSync(fullPath, 'utf8');
    const parsed = matter(raw);

    const title = parsed.data.title || slug;
    const date = parsed.data.date || null;
    const imageUrl = parsed.data.image || null;
    const seconds = getSeconds(parsed.data.seconds);
    const mp3Url = parsed.data.url || null;
    const shownotes = (parsed.content || '').trim();

    // Category derived from the MP3 URL path: /Pixelplausch/Pixelplausch_010.mp3 => Pixelplausch
    let category = null;
    if (mp3Url) {
      const p = new URL(mp3Url).pathname.split('/').filter(Boolean);
      const maybe = p[0];
      if (maybe) category = await ensureCategoryByTitle(state, maybe);
    }

    // If Strapi base.cover/base.banner are required, we must provide them.
    const cover = imageUrl ? await uploadRemoteOnce(state, imageUrl, 'podcast-cover') : await uploadLocalOnce(state, DEFAULT_COVER);
    const banner = imageUrl ? await uploadRemoteOnce(state, imageUrl, 'podcast-banner') : await uploadLocalOnce(state, DEFAULT_BANNER);

    // Audio file upload (can be very large; use caps/allowlist envs).
    // Increase MIGRATION_MAX_BYTES for real runs.
    const audio = mp3Url ? await uploadRemoteOnce(state, mp3Url, 'podcast-audio') : null;

    const publishedAt =
      typeof date === 'string' && date.length > 0
        ? // Treat frontmatter date as UTC if no timezone is provided.
          (date.endsWith('Z') ? date : `${date}:00.000Z`)
        : null;

    if (!APPLY) {
      log(`[dry-run] create podcast ${title} (${slug}) publishedAt=${publishedAt} duration=${seconds}`);
      state.podcasts[slug] = { id: -1, slug };
      continue;
    }

    const existing = await strapiRequestJson(
      'GET',
      `/api/podcasts?filters[slug][$eq]=${encodeURIComponent(slug)}&pagination[pageSize]=1&populate=*`
    );
    const found = existing?.data?.[0];
    if (found?.id) {
      state.podcasts[slug] = { id: found.id, slug };
      continue;
    }

    const created = await strapiRequestJson('POST', '/api/podcasts', {
      data: {
        slug,
        base: {
          title,
          description: '',
          cover: cover.id,
          banner: banner.id,
        },
        duration: seconds,
        shownotes,
        file: audio?.id,
        categories: category?.id ? [category.id] : [],
        publishedAt,
      },
    });

    state.podcasts[slug] = { id: created.data.id, slug };
    log(`created podcast ${title} (${slug})`);
  }
}

async function main() {
  if (!DO_AUTHORS && !DO_PODCASTS) {
    log('Nothing to do. Pass --authors and/or --podcasts');
    process.exit(1);
  }

  const state = readState();
  try {
    if (DO_AUTHORS) await importAuthors(state);
    if (DO_PODCASTS) await importPodcasts(state);
  } finally {
    writeState(state);
  }

  log('Done.');
  log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  log(`State: ${STATE_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


