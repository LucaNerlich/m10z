// @vitest-environment jsdom
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import FontPicker from './FontPicker';
import ThemeSelector from './ThemeSelector';

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
    // jsdom does not implement matchMedia; ThemeSelector and applyTheme use it.
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

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
    vi.restoreAllMocks();
});

function selectElement(): HTMLSelectElement {
    const select = container.querySelector('select');
    if (!select) throw new Error('select not rendered');
    return select;
}

async function choose(value: string): Promise<void> {
    await act(async () => {
        selectElement().value = value;
        selectElement().dispatchEvent(new Event('change', {bubbles: true}));
    });
}

describe('ThemeSelector', () => {
    test('renders the theme list and persists a selection', async () => {
        await act(async () => {
            root.render(<ThemeSelector />);
        });

        const options = Array.from(selectElement().options).map((option) => option.value);
        expect(options).toEqual(['system', 'light', 'dark', 'night', 'paper', 'hacker', 'rainbow', 'oled']);

        await choose('dark');

        expect(selectElement().value).toBe('dark');
        expect(window.localStorage.getItem('m10z-theme')).toBe('dark');
    });
});

describe('FontPicker', () => {
    test('renders the font list and persists a selection', async () => {
        await act(async () => {
            root.render(<FontPicker />);
        });

        expect(selectElement().value).toBe('poppins');

        await choose('neon');

        expect(selectElement().value).toBe('neon');
        expect(window.localStorage.getItem('m10z-font-family')).toBe('neon');
    });

    test('keeps the selection in-session when localStorage rejects writes', async () => {
        vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
            throw new DOMException('quota', 'QuotaExceededError');
        });
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        await act(async () => {
            root.render(<FontPicker />);
        });
        await choose('xenon');

        // The picker still reflects the choice rather than throwing or reverting.
        expect(selectElement().value).toBe('xenon');
    });
});
