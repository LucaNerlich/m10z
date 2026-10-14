// @vitest-environment jsdom
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

vi.mock('next/image', () => ({
    // Render a plain <img> so the test can fire a real error event on it.
    default: ({src, alt, onError}: {src: string; alt?: string; onError?: () => void}) => (
        <img src={src} alt={alt} onError={onError} />
    ),
}));

import {SafeImage} from './SafeImage';

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

const WARNING_TEXT = 'Bild konnte nicht geladen werden';
const ALLOWED_A = 'https://m10z.de/a.jpg';
const ALLOWED_B = 'https://m10z.de/b.jpg';

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

async function render(src: string): Promise<void> {
    await act(async () => {
        root.render(<SafeImage src={src} alt='cover' />);
    });
}

async function failLoadingImage(): Promise<void> {
    const img = container.querySelector('img');
    expect(img, 'expected an <img> to be rendered').not.toBeNull();
    await act(async () => {
        img!.dispatchEvent(new Event('error', {bubbles: true}));
    });
}

describe('SafeImage', () => {
    test('warns for a host outside the allowlist', async () => {
        await render('https://evil.example/x.jpg');
        expect(container.textContent).toContain(WARNING_TEXT);
    });

    test('shows the warning after a load error', async () => {
        await render(ALLOWED_A);
        await failLoadingImage();
        expect(container.textContent).toContain(WARNING_TEXT);
    });

    test('retries when the src changes after a failure', async () => {
        await render(ALLOWED_A);
        await failLoadingImage();
        expect(container.textContent).toContain(WARNING_TEXT);

        // Same position, new URL (e.g. a revalidated list): the warning must not stick.
        await render(ALLOWED_B);

        expect(container.textContent).not.toContain(WARNING_TEXT);
        expect(container.querySelector('img')?.getAttribute('src')).toBe(ALLOWED_B);
    });
});
