// @vitest-environment jsdom
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

vi.mock('next/image', () => ({
    // Surface the placeholder props so the test can assert the blur wiring.
    default: ({
        alt,
        placeholder,
        blurDataURL,
    }: {
        alt?: string;
        placeholder?: string;
        blurDataURL?: string;
    }) => (
        <img
            alt={alt}
            data-placeholder={placeholder ?? ''}
            data-blur={blurDataURL ?? ''}
        />
    ),
}));

import {GalleryImage} from './GalleryImage';

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

const BLURHASH = 'data:image/png;base64,AAAA';
const SRC = 'https://cms.m10z.de/uploads/a.jpg';

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

function renderedImage(): HTMLImageElement {
    const img = container.querySelector('img');
    expect(img, 'expected GalleryImage to render an <img>').not.toBeNull();
    return img as HTMLImageElement;
}

describe('GalleryImage blur placeholder', () => {
    test("uses placeholder='blur' with the media-index blurhash", async () => {
        await act(async () => {
            root.render(
                <GalleryImage src={SRC} alt='cover' blurhash={BLURHASH} />
            );
        });

        expect(renderedImage().dataset.placeholder).toBe('blur');
        expect(renderedImage().dataset.blur).toBe(BLURHASH);
    });

    test("falls back to placeholder='empty' without a blurhash", async () => {
        await act(async () => {
            root.render(<GalleryImage src={SRC} alt='cover' />);
        });

        expect(renderedImage().dataset.placeholder).toBe('empty');
        expect(renderedImage().dataset.blur).toBe('');
    });
});
