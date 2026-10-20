// @vitest-environment jsdom
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';

import WichtelnPage from './page';

const STORAGE_KEY = 'm10z-wichteln-state';

function stored(name: string): string {
    return JSON.stringify({
        participants: [{id: name, name, profileUrl: ''}],
        assignments: [],
        timestamp: 1,
    });
}

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => {
        root.unmount();
    });
    container.remove();
    window.localStorage.clear();
});

describe('WichtelnPage cross-tab sync', () => {
    test('loads participants written by another tab', async () => {
        window.localStorage.setItem(STORAGE_KEY, stored('Alice'));
        await act(async () => {
            root.render(<WichtelnPage />);
        });
        expect(container.textContent).toContain('Alice');

        window.localStorage.setItem(STORAGE_KEY, stored('Bob'));
        await act(async () => {
            window.dispatchEvent(new StorageEvent('storage', {key: STORAGE_KEY}));
        });

        expect(container.textContent).toContain('Bob');
        expect(container.textContent).not.toContain('Alice');
    });

    test('clears participants when another tab clears storage', async () => {
        window.localStorage.setItem(STORAGE_KEY, stored('Alice'));
        await act(async () => {
            root.render(<WichtelnPage />);
        });
        expect(container.textContent).toContain('Alice');

        window.localStorage.removeItem(STORAGE_KEY);
        await act(async () => {
            window.dispatchEvent(new StorageEvent('storage', {key: null}));
        });

        expect(container.textContent).not.toContain('Alice');
    });
});
