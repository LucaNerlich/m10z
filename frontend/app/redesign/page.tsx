import {Suspense} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {type Metadata} from 'next';

import {Tag} from '@/src/components/Tag';
import {FeedSkeleton} from '@/src/components/FeedSkeleton';
import {buildContentFeed} from '@/src/lib/contentFeed';
import {mediaUrlToAbsolute} from '@/src/lib/rss/media';
import {formatDateShort, formatDateFull} from '@/src/lib/dateFormatters';
import {calculateReadingTime} from '@/src/lib/readingTime';
import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';
import {umamiEventId} from '@/src/lib/analytics/umami';
import placeholderCover from '@/public/images/m10z.jpg';
import styles from './page.module.css';

const PAGE_SIZE = 10;

export const metadata: Metadata = buildStaticListMetadata({
    description:
        'Diskmag-Redesign: Mindestens 10 Zeichen als brutalist-editoriales Spielheft. Artikel und Podcasts, gesetzt wie ein Magazin.',
    path: '/redesign',
    ogImageAlt: 'M10Z Diskmag Redesign',
});

type PageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RedesignPage({searchParams}: PageProps) {
    const sp = (await searchParams) ?? {};
    const raw = sp.page;
    const rawString = Array.isArray(raw) ? raw[0] : raw;
    const parsed = Number(rawString);
    const page =
        Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 50) : 1;

    return (
        <div data-homepage className={styles.shell}>
            <Suspense fallback={<FeedSkeleton />}>
                <DiskmagHome page={page} />
            </Suspense>
        </div>
    );
}

async function DiskmagHome({page}: {page: number}) {
    const data = await buildContentFeed(page, PAGE_SIZE, {tags: ['page:home']});
    if (!data || data.items.length === 0) {
        return (
            <div className={styles.empty}>
                <span className={styles.emptyMark}>—</span>
                <p>Stille auf dem Sender. Kein Druck heute.</p>
            </div>
        );
    }

    const items = data.items;
    const [hero, ...rest] = items;

    // Aggregate metadata for the masthead ticker
    const totalWords = items.reduce(
        (acc, it) => acc + (it.type === 'article' && it.wordCount ? it.wordCount : 0),
        0,
    );
    const totalListenSeconds = items.reduce(
        (acc, it) => acc + (it.type === 'podcast' && it.duration ? it.duration : 0),
        0,
    );
    const articleCount = items.filter((i) => i.type === 'article').length;
    const podcastCount = items.filter((i) => i.type === 'podcast').length;
    const issueNumber = `№ ${String(page).padStart(2, '0')} / ${new Date().getFullYear()}`;
    const printedOn = formatDateFull(new Date().toISOString());

    const heroCover = mediaUrlToAbsolute({media: hero.cover}) ?? placeholderCover;
    const heroBanner =
        mediaUrlToAbsolute({media: hero.banner}) ??
        mediaUrlToAbsolute({media: hero.cover}) ??
        placeholderCover;
    const heroBlur = hero.banner?.blurhash ?? hero.cover?.blurhash ?? null;

    return (
        <article className={styles.diskmag}>
            {/* TICKER — runs full-bleed across the top */}
            <div className={styles.ticker} aria-hidden="true">
                <div className={styles.tickerTrack}>
                    {Array.from({length: 2}).map((_, i) => (
                        <div key={i} className={styles.tickerGroup}>
                            <span className={styles.tickerDot}>●</span>
                            <span>SYS://M10Z.DE</span>
                            <span className={styles.tickerSep}>/</span>
                            <span>STATUS: ONLINE</span>
                            <span className={styles.tickerSep}>/</span>
                            <span>UPLINK STABIL</span>
                            <span className={styles.tickerSep}>/</span>
                            <span>{issueNumber.replace('№ ', 'AUSGABE ')}</span>
                            <span className={styles.tickerSep}>/</span>
                            <span>{printedOn.toUpperCase()}</span>
                            <span className={styles.tickerSep}>/</span>
                            <span>WÖRTER: {totalWords.toLocaleString('de-DE')}</span>
                            <span className={styles.tickerSep}>/</span>
                            <span>HÖRZEIT: {formatListen(totalListenSeconds)}</span>
                            <span className={styles.tickerSep}>/</span>
                            <span>Ø MINDESTENS 10 ZEICHEN</span>
                            <span className={styles.tickerSep}>/</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* MASTHEAD */}
            <header className={styles.masthead}>
                <div className={styles.mastheadTop}>
                    <span className={styles.tag}>DISKMAG</span>
                    <span className={styles.tag}>v.{page}.0</span>
                    <span className={styles.mastheadDate}>{printedOn}</span>
                </div>
                <h1 className={styles.wordmark}>
                    <span className={styles.wordmarkRow}>
                        <span className={styles.wordmarkBig}>M</span>
                        <span className={styles.wordmarkBig}>I</span>
                        <span className={styles.wordmarkBig}>N</span>
                        <span className={styles.wordmarkBig}>D</span>
                        <span className={styles.wordmarkBig}>E</span>
                        <span className={styles.wordmarkBig}>S</span>
                        <span className={styles.wordmarkBig}>T</span>
                        <span className={styles.wordmarkBig}>E</span>
                        <span className={styles.wordmarkBig}>N</span>
                        <span className={styles.wordmarkBig}>S</span>
                    </span>
                    <span className={styles.wordmarkRow}>
                        <span className={styles.wordmarkAccent}>10</span>
                        <span className={styles.wordmarkSmall}>Zeichen</span>
                    </span>
                </h1>
                <div className={styles.mastheadFoot}>
                    <p className={styles.kicker}>
                        Ein offener Kanal für Videospielcontent und das Drumherum.
                        Unentgeltlich. Unabhängig. Ungezwungen. Seit es Forenposts gibt.
                    </p>
                    <dl className={styles.colophon}>
                        <div>
                            <dt>Ausgabe</dt>
                            <dd>{issueNumber}</dd>
                        </div>
                        <div>
                            <dt>Beiträge</dt>
                            <dd>
                                {articleCount} Artikel · {podcastCount} Podcasts
                            </dd>
                        </div>
                        <div>
                            <dt>Volumen</dt>
                            <dd>{totalWords.toLocaleString('de-DE')} Wörter</dd>
                        </div>
                        <div>
                            <dt>Hörzeit</dt>
                            <dd>{formatListen(totalListenSeconds)}</dd>
                        </div>
                    </dl>
                </div>
            </header>

            <div className={styles.body}>
                {/* HERO COVER STORY */}
                <section className={styles.hero} aria-label="Titelgeschichte">
                    <Link
                        href={hero.href}
                        className={styles.heroLink}
                        data-umami-event={umamiEventId(['redesign', 'hero', hero.type, hero.slug])}
                    >
                        <div className={styles.heroFigure}>
                            <Image
                                src={heroBanner}
                                width={1600}
                                height={900}
                                quality={75}
                                priority
                                sizes="(max-width: 900px) 100vw, 1100px"
                                placeholder={heroBlur ? 'blur' : 'empty'}
                                blurDataURL={heroBlur || undefined}
                                alt={hero.cover?.alternativeText ?? hero.title}
                                className={styles.heroImage}
                            />
                            <span className={styles.heroBleed} aria-hidden="true" />
                            <span className={styles.heroNumber} aria-hidden="true">
                                01
                            </span>
                        </div>
                        <div className={styles.heroCopy}>
                            <div className={styles.heroMeta}>
                                <span className={styles.heroBadge}>
                                    {hero.type === 'article' ? 'TITELSTORY · ARTIKEL' : 'TITELSTORY · PODCAST'}
                                </span>
                                <span className={styles.heroDate}>
                                    {formatDateShort(hero.publishedAt)}
                                </span>
                            </div>
                            <h2 className={styles.heroTitle}>{hero.title}</h2>
                            {hero.description ? (
                                <p className={styles.heroDek}>{hero.description}</p>
                            ) : null}
                            <div className={styles.heroFooter}>
                                <span className={styles.heroCta}>
                                    {hero.type === 'article' ? 'Lesen →' : 'Anhören →'}
                                </span>
                                <span className={styles.heroStat}>
                                    {hero.type === 'article' && hero.wordCount
                                        ? `${hero.wordCount.toLocaleString('de-DE')} Wörter · ${calculateReadingTime(hero.wordCount).replace('~', '')}`
                                        : hero.type === 'podcast' && hero.duration
                                          ? `Spieldauer ${formatListen(hero.duration)}`
                                          : ''}
                                </span>
                            </div>
                        </div>
                    </Link>
                </section>

                {/* TABLE OF CONTENTS — INHALT REGISTER */}
                <aside className={styles.register} aria-label="Inhalt">
                    <div className={styles.registerHead}>
                        <span className={styles.registerLabel}>Inhalt</span>
                        <span className={styles.registerRule} aria-hidden="true" />
                        <span className={styles.registerCount}>
                            {String(items.length).padStart(2, '0')}
                        </span>
                    </div>
                    <ol className={styles.registerList}>
                        {items.map((item, idx) => {
                            const anchor = `${item.type}-${item.slug}`;
                            return (
                                <li key={anchor} className={styles.registerItem}>
                                    <a
                                        href={`#${anchor}`}
                                        className={styles.registerLink}
                                        data-umami-event={umamiEventId([
                                            'redesign',
                                            'toc',
                                            item.type,
                                            item.slug,
                                        ])}
                                    >
                                        <span className={styles.registerNum}>
                                            {String(idx + 1).padStart(2, '0')}
                                        </span>
                                        <span className={styles.registerTitle}>
                                            {item.title}
                                        </span>
                                        <span className={styles.registerLeader} aria-hidden="true" />
                                        <span className={styles.registerKind}>
                                            {item.type === 'article' ? 'ART' : 'POD'}
                                        </span>
                                    </a>
                                </li>
                            );
                        })}
                    </ol>
                </aside>

                {/* NUMBERED ENTRIES */}
                <section className={styles.feed} aria-label="Beiträge der Ausgabe">
                    <header className={styles.feedHead}>
                        <span className={styles.feedHeadKicker}>§ 02 — 10</span>
                        <h3 className={styles.feedHeadTitle}>Weitere Stücke</h3>
                        <span className={styles.feedHeadRule} aria-hidden="true" />
                    </header>
                    <ol className={styles.entries}>
                        {rest.map((item, i) => {
                            const idx = i + 2;
                            const anchor = `${item.type}-${item.slug}`;
                            const coverUrl =
                                mediaUrlToAbsolute({media: item.cover}) ??
                                mediaUrlToAbsolute({media: item.banner}) ??
                                placeholderCover;
                            const blur = item.cover?.blurhash ?? item.banner?.blurhash ?? null;
                            const flip = i % 2 === 1;
                            return (
                                <li
                                    key={anchor}
                                    id={anchor}
                                    className={`${styles.entry} ${flip ? styles.entryFlip : ''}`}
                                    style={{['--stagger' as string]: `${i * 60}ms`}}
                                >
                                    <Link
                                        href={item.href}
                                        className={styles.entryLink}
                                        data-umami-event={umamiEventId([
                                            'redesign',
                                            'entry',
                                            item.type,
                                            item.slug,
                                        ])}
                                    >
                                        <span className={styles.entryNumber} aria-hidden="true">
                                            {String(idx).padStart(2, '0')}
                                        </span>
                                        <div className={styles.entryFigure}>
                                            <Image
                                                src={coverUrl}
                                                width={640}
                                                height={640}
                                                sizes="(max-width: 900px) 100vw, 360px"
                                                quality={60}
                                                placeholder={blur ? 'blur' : 'empty'}
                                                blurDataURL={blur || undefined}
                                                alt={item.cover?.alternativeText ?? item.title}
                                                className={styles.entryImage}
                                            />
                                            <span className={styles.entryCorner} aria-hidden="true">
                                                {item.type === 'article' ? '◤ ARTIKEL' : '◤ PODCAST'}
                                            </span>
                                        </div>
                                        <div className={styles.entryBody}>
                                            <div className={styles.entryMeta}>
                                                <Tag className={styles.entryTag}>
                                                    {item.type === 'article' ? 'Artikel' : 'Podcast'}
                                                </Tag>
                                                <span className={styles.entryDate}>
                                                    {formatDateShort(item.publishedAt)}
                                                </span>
                                                <span className={styles.entryStat}>
                                                    {item.type === 'article' && item.wordCount
                                                        ? calculateReadingTime(item.wordCount).replace('~', '')
                                                        : item.type === 'podcast' && item.duration
                                                          ? formatListen(item.duration)
                                                          : ''}
                                                </span>
                                            </div>
                                            <h4 className={styles.entryTitle}>{item.title}</h4>
                                            {item.description ? (
                                                <p className={styles.entryDek}>
                                                    {item.description}
                                                </p>
                                            ) : null}
                                            <div className={styles.entryFoot}>
                                                <span className={styles.entryCta}>
                                                    {item.type === 'article' ? 'Weiterlesen →' : 'Anhören →'}
                                                </span>
                                                <span className={styles.entryRule} aria-hidden="true" />
                                                <span className={styles.entrySlug}>
                                                    /{item.type}/{item.slug}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ol>
                </section>
            </div>

            {/* COLOPHON FOOTER */}
            <footer className={styles.colophonFooter}>
                <div className={styles.colophonLeft}>
                    <span className={styles.regMark} aria-hidden="true">
                        ⊕
                    </span>
                    <p>
                        Gesetzt in <em>Monaspace Xenon</em> &amp; <em>Monaspace Neon</em>.
                        Druck auf virtuellem Naturpapier 96 g/m².
                    </p>
                </div>
                <div className={styles.colophonRight}>
                    <span>Seite 01 / {items.length.toString().padStart(2, '0')}</span>
                    <span className={styles.colophonSep}>·</span>
                    <span>Diskmag Redesign — Vorschau</span>
                </div>
            </footer>
        </article>
    );
}

function formatListen(seconds: number): string {
    if (!seconds || seconds <= 0) return '0 min';
    const total = Math.round(seconds / 60);
    if (total < 60) return `${total} min`;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
}
