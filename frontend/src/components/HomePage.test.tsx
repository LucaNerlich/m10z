import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach, describe, expect, test, vi} from 'vitest';

const {buildContentFeed} = vi.hoisted(() => ({buildContentFeed: vi.fn()}));

vi.mock('@/src/lib/contentFeed', () => ({buildContentFeed}));

// Render next/image's getImageProps as plain props so the test can inspect
// which image ends up in which slot.
vi.mock('next/image', () => ({
    getImageProps: ({
        src,
        alt,
        className,
        sizes,
        loading,
    }: {
        src: string;
        alt?: string;
        className?: string;
        sizes?: string;
        loading?: string;
    }) => ({props: {src, alt, className, sizes, loading, srcSet: src}}),
}));

import {HomePage} from './HomePage';

function feedItem(overrides: Record<string, unknown> = {}) {
    return {
        type: 'article',
        slug: 'a',
        title: 'Erster Artikel',
        description: 'Beschreibung',
        publishedAt: '2026-04-20T09:00:00.000Z',
        cover: {url: 'https://cdn.example.test/cover.jpg', width: 400, height: 400, blurhash: 'coverhash'},
        banner: {url: 'https://cdn.example.test/banner.jpg', width: 800, height: 450, blurhash: 'bannerhash'},
        wordCount: 100,
        href: '/artikel/a',
        ...overrides,
    };
}

function feedResponse(items: Array<Record<string, unknown>>) {
    return {
        items,
        pagination: {page: 1, pageSize: 10, pageCount: 1, total: items.length},
        hasNextPage: false,
    };
}

describe('HomePage', () => {
    afterEach(() => {
        buildContentFeed.mockReset();
    });

    test('renders exactly one <img> per card (no hidden cover/banner pair)', async () => {
        buildContentFeed.mockResolvedValue(
            feedResponse([feedItem(), feedItem({slug: 'b', href: '/artikel/b', title: 'Zweiter Artikel'})]),
        );

        const html = renderToStaticMarkup(await HomePage({page: 1}));

        expect(html.match(/<img /g)).toHaveLength(2);
    });

    test('marks only the first card image as eager', async () => {
        buildContentFeed.mockResolvedValue(
            feedResponse([feedItem(), feedItem({slug: 'b', href: '/artikel/b', title: 'Zweiter Artikel'})]),
        );

        const html = renderToStaticMarkup(await HomePage({page: 1}));

        // One eager/preloaded LCP image instead of one per card.
        expect(html.match(/loading="eager"/g)).toHaveLength(1);
    });

    test('shows the banner in the 16:9 mobile slot and the cover in the 1:1 desktop slot', async () => {
        buildContentFeed.mockResolvedValue(feedResponse([feedItem()]));

        const html = renderToStaticMarkup(await HomePage({page: 1}));

        // Mobile/tablet (<=1080px) gets the 16:9 banner via <picture>.
        expect(html).toContain('<source media="(max-width: 1080px)" srcSet="https://cdn.example.test/banner.jpg"');
        // Desktop keeps the square cover.
        expect(html).toContain('<img src="https://cdn.example.test/cover.jpg"');
    });

    test('uses the square cover for the 1:1 card slot and falls back to the banner', async () => {
        buildContentFeed.mockResolvedValue(
            feedResponse([
                feedItem(),
                // The feed mapper emits `{}` for a missing cover, not `undefined`.
                feedItem({slug: 'b', href: '/artikel/b', title: 'Zweiter Artikel', cover: {}}),
            ]),
        );

        const html = renderToStaticMarkup(await HomePage({page: 1}));

        // The desktop slot is 1:1, so the square cover beats the 16:9 banner there.
        expect(html).toContain('<img src="https://cdn.example.test/cover.jpg"');
        // Content without a cover still uses its banner, without art direction.
        expect(html).toContain('<img src="https://cdn.example.test/banner.jpg"');
        expect(html.match(/<source /g)).toHaveLength(1);
    });
});
