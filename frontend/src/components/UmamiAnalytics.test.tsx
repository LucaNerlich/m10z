// @vitest-environment jsdom
import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

const pathname = vi.hoisted(() => ({current: '/'}));

vi.mock('next/navigation', () => ({usePathname: () => pathname.current}));
vi.mock('next/script', () => ({
    default: ({src, ...rest}: {src: string; [key: string]: unknown}) => (
        <span data-script-src={src} {...rest} />
    ),
}));

import UmamiAnalytics from './UmamiAnalytics';

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_UMAMI_WEBSITE_ID', 'test-website');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => {
        root.unmount();
    });
    container.remove();
    vi.unstubAllEnvs();
});

async function renderAt(path: string): Promise<HTMLElement[]> {
    pathname.current = path;
    await act(async () => {
        root.render(<UmamiAnalytics />);
    });
    return Array.from(container.querySelectorAll('[data-script-src]')) as HTMLElement[];
}

describe('UmamiAnalytics', () => {
    test('loads the tracker and the recorder on a normal page without the query string', async () => {
        const scripts = await renderAt('/artikel/erstes-spiel-test');
        expect(scripts.some((el) => el.getAttribute('data-script-src')?.endsWith('/script.js'))).toBe(true);
        expect(scripts.some((el) => el.getAttribute('data-script-src')?.endsWith('/recorder.js'))).toBe(true);
        for (const el of scripts) {
            expect(el.getAttribute('data-exclude-search')).toBe('true');
        }
    });

    test('renders nothing on a preview route', async () => {
        expect(await renderAt('/preview/artikel/erstes-spiel-test')).toEqual([]);
    });

    test('reloads into a preview route when a tracker is already loaded', async () => {
        const reload = vi.fn();
        const originalLocation = window.location;
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: {...originalLocation, reload},
        });
        (window as unknown as {umami?: unknown}).umami = () => undefined;

        try {
            await renderAt('/preview/artikel/erstes-spiel-test');
            expect(reload).toHaveBeenCalledTimes(1);
        } finally {
            delete (window as unknown as {umami?: unknown}).umami;
            Object.defineProperty(window, 'location', {configurable: true, value: originalLocation});
        }
    });
});
