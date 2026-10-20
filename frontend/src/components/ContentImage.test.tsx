// @vitest-environment jsdom
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

vi.mock('next/image', () => ({
    // Surface the placeholder props so the test can assert the fallback logic.
    default: ({
        alt,
        placeholder,
        blurDataURL,
        sizes,
    }: {
        alt?: string;
        placeholder?: string;
        blurDataURL?: string;
        sizes?: string;
    }) => <img alt={alt} data-placeholder={placeholder ?? ''} data-blur={blurDataURL ?? ''} data-sizes={sizes ?? ''} />,
}));

import {ContentImage} from './ContentImage';

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

const BLURHASH = 'data:image/png;base64,AAAA';

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
    expect(img, 'expected ContentImage to render an <img>').not.toBeNull();
    return img as HTMLImageElement;
}

describe('ContentImage placeholder', () => {
    test("degrades placeholder='blur' to 'empty' when there is no blurhash", async () => {
        await act(async () => {
            root.render(<ContentImage src='https://m10z.de/a.jpg' alt='cover' width={400} height={225} placeholder='blur' />);
        });

        expect(renderedImage().dataset.placeholder).toBe('empty');
        expect(renderedImage().dataset.blur).toBe('');
    });

    test("keeps placeholder='blur' with the blurDataURL when a blurhash exists", async () => {
        await act(async () => {
            root.render(
                <ContentImage src='https://m10z.de/a.jpg' alt='cover' width={400} height={225} placeholder='blur' blurhash={BLURHASH} />,
            );
        });

        expect(renderedImage().dataset.placeholder).toBe('blur');
        expect(renderedImage().dataset.blur).toBe(BLURHASH);
    });

    test("keeps placeholder='blur' for a static import that carries blurDataURL", async () => {
        await act(async () => {
            root.render(
                <ContentImage
                    src={{
                        src: '/_next/static/media/m10z.0123.jpg',
                        width: 400,
                        height: 225,
                        blurDataURL: 'data:image/jpeg;base64,BBBB',
                    }}
                    alt='cover'
                    width={400}
                    height={225}
                    placeholder='blur'
                />,
            );
        });

        expect(renderedImage().dataset.placeholder).toBe('blur');
    });

    test("defaults to 'empty' when no placeholder is requested", async () => {
        await act(async () => {
            root.render(<ContentImage src='https://m10z.de/a.jpg' alt='cover' width={400} height={225} />);
        });

        expect(renderedImage().dataset.placeholder).toBe('empty');
    });

    test('forwards sizes to next/image so cards pick a rendered-size candidate', async () => {
        await act(async () => {
            root.render(
                <ContentImage src='https://m10z.de/a.jpg' alt='cover' width={400} height={225} sizes='33vw' />,
            );
        });

        expect(renderedImage().dataset.sizes).toBe('33vw');
    });
});
