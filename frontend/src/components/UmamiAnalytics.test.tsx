// @vitest-environment jsdom
import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

const pathname = vi.hoisted(() => ({current: '/'}));

vi.mock('next/navigation', () => ({usePathname: () => pathname.current}));
vi.mock('next/script', () => ({
    default: ({src}: {src: string}) => <span data-script-src={src} />,
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

async function renderAt(path: string): Promise<string[]> {
    pathname.current = path;
    await act(async () => {
        root.render(<UmamiAnalytics />);
    });
    return Array.from(container.querySelectorAll('[data-script-src]')).map(
        (el) => el.getAttribute('data-script-src') ?? '',
    );
}

describe('UmamiAnalytics', () => {
    test('loads the tracker and the recorder on a normal page', async () => {
        const sources = await renderAt('/artikel/erstes-spiel-test');
        expect(sources.some((src) => src.endsWith('/script.js'))).toBe(true);
        expect(sources.some((src) => src.endsWith('/recorder.js'))).toBe(true);
    });

    test('renders nothing on a preview route', async () => {
        const sources = await renderAt('/preview/artikel/erstes-spiel-test');
        expect(sources).toEqual([]);
    });
});
