// @vitest-environment jsdom
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

const bind = vi.hoisted(() => vi.fn());

vi.mock('@fancyapps/ui', () => ({
    Fancybox: {bind, destroy: vi.fn()},
}));

import {FancyboxClient} from './FancyboxClient';

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
    bind.mockClear();
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

async function renderAndGetOptions() {
    await act(async () => {
        root.render(
            <FancyboxClient>
                <div />
            </FancyboxClient>,
        );
    });
    // The effect dynamically imports the module; flush the microtask queue.
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
    });
    expect(bind).toHaveBeenCalledTimes(1);
    return bind.mock.calls[0][1].Carousel as {
        formatCaption: (carousel: unknown, slide: {caption?: unknown}) => unknown;
    };
}

describe('FancyboxClient captions', () => {
    test('renders an HTML caption as text, not markup', async () => {
        const carousel = await renderAndGetOptions();
        const payload = '<img src=x onerror=alert(1)>';

        const caption = carousel.formatCaption({}, {caption: payload}) as HTMLElement;

        expect(caption).toBeInstanceOf(HTMLElement);
        expect(caption.textContent).toBe(payload);
        expect(caption.innerHTML).not.toContain('<img');
    });

    test('returns no element for an empty caption', async () => {
        const carousel = await renderAndGetOptions();
        expect(carousel.formatCaption({}, {caption: ''})).toBe('');
        expect(carousel.formatCaption({}, {})).toBe('');
    });
});
