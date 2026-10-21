// @vitest-environment jsdom
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {SWRConfig} from 'swr';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {type SearchResult} from '@/src/lib/search/types';

const SEARCH_RESULT: SearchResult = {
    id: 'article:ab-artikel',
    slug: 'ab-artikel',
    title: 'AB',
    type: 'article',
    href: '/artikel/ab-artikel',
    tags: [],
};

vi.mock('@/src/lib/swr/config', () => ({
    fetcher: vi.fn(async () => ({results: [SEARCH_RESULT], total: 1, query: 'ab'})),
}));

import {useSearchQuery} from './useSearchQuery';

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let latest: ReturnType<typeof useSearchQuery> | null;

function Probe({query}: {query: string}) {
    latest = useSearchQuery(query);
    return null;
}

function render(query: string) {
    root.render(
        <SWRConfig value={{provider: () => new Map(), dedupingInterval: 0}}>
            <Probe query={query} />
        </SWRConfig>,
    );
}

beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latest = null;
});

afterEach(async () => {
    await act(async () => {
        root.unmount();
    });
    container.remove();
});

describe('useSearchQuery minimum length', () => {
    test('a shortened below-minimum query drops the previous results immediately', async () => {
        vi.useFakeTimers();
        try {
            await act(async () => {
                render('ab');
            });
            await act(async () => {
                vi.advanceTimersByTime(200);
            });
            await act(async () => {
                await Promise.resolve();
            });
            expect(latest?.results).toHaveLength(1);

            await act(async () => {
                render('a');
            });

            expect(latest?.results).toEqual([]);
            expect(latest?.isLoading).toBe(false);
        } finally {
            vi.useRealTimers();
        }
    });
});
