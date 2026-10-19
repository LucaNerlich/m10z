// @vitest-environment jsdom
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

vi.mock('next/image', () => ({
    // Surface the placeholder props the card hands to next/image.
    default: ({alt, placeholder, blurDataURL}: {alt?: string; placeholder?: string; blurDataURL?: string}) => (
        <img alt={alt} data-placeholder={placeholder ?? ''} data-blur={blurDataURL ?? ''} />
    ),
}));

import {type StrapiCategoryRef} from '@/src/lib/strapi/media';

import {CategoryCard} from './CategoryCard';

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => {
        root.unmount();
    });
    container.remove();
});

function media(host: string, blurhash: string) {
    return {
        url: `https://cms.m10z.de/uploads/${host}.jpg`,
        width: 1200,
        height: 675,
        blurhash,
        alternativeText: null,
        caption: null,
    };
}

async function render(category: StrapiCategoryRef): Promise<void> {
    await act(async () => {
        root.render(<CategoryCard category={category} />);
    });
}

function renderedImage(): HTMLImageElement {
    const img = container.querySelector('img');
    expect(img, 'expected the card to render an <img>').not.toBeNull();
    return img as HTMLImageElement;
}

describe('CategoryCard blurhash source', () => {
    test('takes the blur placeholder from the banner when a banner is shown', async () => {
        await render({
            slug: 'gaming',
            title: 'Gaming',
            banner: media('banner', 'banner-hash'),
            cover: media('cover', 'cover-hash'),
        });

        expect(renderedImage().dataset.placeholder).toBe('blur');
        expect(renderedImage().dataset.blur).toBe('banner-hash');
    });

    test('uses the banner blurhash for a banner-only category', async () => {
        await render({
            slug: 'gaming',
            title: 'Gaming',
            banner: media('banner', 'banner-hash'),
        });

        expect(renderedImage().dataset.placeholder).toBe('blur');
        expect(renderedImage().dataset.blur).toBe('banner-hash');
    });

    test('still uses the cover blurhash for a cover-only category', async () => {
        await render({
            slug: 'gaming',
            title: 'Gaming',
            cover: media('cover', 'cover-hash'),
        });

        expect(renderedImage().dataset.placeholder).toBe('blur');
        expect(renderedImage().dataset.blur).toBe('cover-hash');
    });
});
