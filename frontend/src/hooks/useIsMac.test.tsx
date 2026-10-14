// @vitest-environment jsdom
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {useIsMac} from './useIsMac';

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

function setPlatform(platform: string): void {
    Object.defineProperty(window.navigator, 'platform', {value: platform, configurable: true});
}

function Consumer() {
    return <output>{useIsMac() ? 'mac' : 'other'}</output>;
}

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
    vi.restoreAllMocks();
});

async function render(): Promise<string> {
    await act(async () => {
        root.render(<Consumer />);
    });
    return container.textContent ?? '';
}

describe('useIsMac', () => {
    test.each(['MacIntel', 'Macintosh', 'iPhone', 'iPad', 'iPod'])('true for %s', async (platform) => {
        setPlatform(platform);
        expect(await render()).toBe('mac');
    });

    test.each(['Win32', 'Linux x86_64', ''])('false for %s', async (platform) => {
        setPlatform(platform);
        expect(await render()).toBe('other');
    });
});
