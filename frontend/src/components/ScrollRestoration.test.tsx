// @vitest-environment jsdom
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

let pathname = '/a';

vi.mock('next/navigation', () => ({usePathname: () => pathname}));

import {ScrollRestoration} from './ScrollRestoration';

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let scrollTo: ReturnType<typeof vi.fn>;

beforeEach(() => {
    pathname = '/a';
    window.history.replaceState({}, '', '/a');

    scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    // Run the rAF callback synchronously so assertions do not need to wait.
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        callback(0);
        return 0;
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => {
        root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
});

/** Simulate a route change to `next` (URL and hook value move together). */
async function navigateTo(next: string): Promise<void> {
    pathname = next;
    window.history.replaceState({}, '', next);
    await act(async () => {
        root.render(<ScrollRestoration />);
    });
}

/** Simulate a browser back/forward to `url`. */
async function popStateTo(url: string): Promise<void> {
    window.history.replaceState({}, '', url);
    await act(async () => {
        window.dispatchEvent(new PopStateEvent('popstate'));
    });
}

describe('ScrollRestoration', () => {
    test('scrolls to the top on a normal route change', async () => {
        await navigateTo('/a');
        scrollTo.mockClear();

        await navigateTo('/b');

        expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    test('skips the scroll reset for a back navigation', async () => {
        await navigateTo('/a');
        scrollTo.mockClear();

        await popStateTo('/x');
        await navigateTo('/x');

        expect(scrollTo).not.toHaveBeenCalled();
    });

    test('a hash-only popstate does not suppress the next route change', async () => {
        await navigateTo('/a');
        scrollTo.mockClear();

        // Back to an in-page anchor: the pathname does not change, so this must not
        // leave the skip armed.
        await popStateTo('/a#section');
        await navigateTo('/b');

        expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    test('does not scroll when the target URL has a hash', async () => {
        await navigateTo('/a');
        scrollTo.mockClear();

        await navigateTo('/b#anchor');

        expect(scrollTo).not.toHaveBeenCalled();
    });
});
