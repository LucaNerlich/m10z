// @vitest-environment jsdom
import {type ReactNode} from 'react';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

vi.mock('next/link', () => ({
    default: ({href, className, children}: {href: string; className?: string; children: ReactNode}) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));

import {Pagination} from './Pagination';

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

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

async function renderPagination(props: {
    currentPage: number;
    totalPages: number;
    previousHref?: string;
    nextHref?: string;
}): Promise<void> {
    await act(async () => {
        root.render(<Pagination {...props} />);
    });
}

describe('Pagination', () => {
    test('renders a disabled button for the href-less non-last-page state', async () => {
        // Reachable on the home feed: `totalPages` uses raw totals while
        // `hasNextPage` is capped by the fetchable window, so the next page can
        // exist without an href.
        await renderPagination({currentPage: 2, totalPages: 5, previousHref: '/?page=1'});

        const next = container.querySelectorAll('button');
        expect(next).toHaveLength(1);
        expect(next[0].textContent).toBe('Weiter');
        expect(next[0].disabled).toBe(true);
        expect(container.querySelector('a[href="/?page=3"]')).toBeNull();
        expect(container.querySelector('a[href="/?page=1"]')?.textContent).toBe('Zurück');
    });

    test('renders a disabled button for the href-less non-first-page state', async () => {
        await renderPagination({currentPage: 2, totalPages: 5, nextHref: '/?page=3'});

        const previous = container.querySelector('button');
        expect(previous?.textContent).toBe('Zurück');
        expect(previous?.disabled).toBe(true);
        expect(container.querySelector('a[href="/?page=3"]')?.textContent).toBe('Weiter');
    });
});
