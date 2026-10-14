// @vitest-environment jsdom
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

const {useSWR} = vi.hoisted(() => ({
    // Typed with parameters so `mock.calls` carries the key tuple.
    useSWR: vi.fn((_key?: unknown, _fetcher?: unknown, _options?: unknown) => ({
        data: undefined as unknown,
        error: undefined as unknown,
        isLoading: false,
        isValidating: false,
    })),
}));

vi.mock('swr', () => ({default: useSWR}));
vi.mock('@/src/lib/swr/config', () => ({fetcher: vi.fn()}));

import {useSearchQuery} from './useSearchQuery';

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

const DEBOUNCE_MS = 150;

function Consumer({query}: {query: string}) {
    const {results, total} = useSearchQuery(query, DEBOUNCE_MS);
    return <output data-total={total}>{results.length}</output>;
}

/** The SWR key from the most recent render — `null` means "do not fetch". */
function lastKey(): unknown {
    return useSWR.mock.calls.at(-1)?.[0];
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
    vi.useFakeTimers();
    useSWR.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => {
        root.unmount();
    });
    container.remove();
    vi.useRealTimers();
});

async function renderQuery(query: string): Promise<void> {
    await act(async () => {
        root.render(<Consumer query={query} />);
    });
}

async function settleDebounce(ms = DEBOUNCE_MS): Promise<void> {
    await act(async () => {
        vi.advanceTimersByTime(ms);
    });
}

describe('useSearchQuery', () => {
    test('does not fetch below the two-character minimum', async () => {
        await renderQuery('a');
        await settleDebounce();

        expect(lastKey()).toBeNull();
    });

    test('fetches the encoded query once the debounced value reaches the minimum', async () => {
        await renderQuery('mI x');
        await settleDebounce();

        expect(lastKey()).toBe('/api/search-index?q=mI%20x');
    });

    test('debounces: only the final query of a burst is fetched', async () => {
        await renderQuery('m');
        await act(async () => {
            vi.advanceTimersByTime(100);
        });

        // Second keystroke before the first debounce elapses.
        await renderQuery('mi');
        await settleDebounce();

        const keys = useSWR.mock.calls.map((call) => call[0]);
        expect(keys).toContain('/api/search-index?q=mi');
        expect(keys).not.toContain('/api/search-index?q=m');
        expect(lastKey()).toBe('/api/search-index?q=mi');
    });

    test('trims the query before using it as the key', async () => {
        await renderQuery('  hallo  ');
        await settleDebounce();

        expect(lastKey()).toBe('/api/search-index?q=hallo');
    });

    test('returns empty results without fetching for an empty query', async () => {
        await renderQuery('');
        await settleDebounce();

        expect(lastKey()).toBeNull();
        expect(container.textContent).toBe('0');
        expect(container.querySelector('output')?.dataset.total).toBe('0');
    });
});
