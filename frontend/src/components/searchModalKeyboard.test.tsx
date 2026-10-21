// @vitest-environment jsdom
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

const {useSearchQuery, push} = vi.hoisted(() => ({
    useSearchQuery: vi.fn(),
    push: vi.fn(),
}));

vi.mock('@/src/hooks/useSearchQuery', () => ({useSearchQuery, SEARCH_MIN_QUERY_LENGTH: 2, SEARCH_MAX_QUERY_LENGTH: 200}));
vi.mock('next/navigation', () => ({useRouter: () => ({push})}));

import type {SearchResult} from '@/src/lib/search/types';

import {SearchModal} from './SearchModal';

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

const RESULTS: SearchResult[] = [
    {id: '1', type: 'article', slug: 'eins', title: 'Eins', href: '/artikel/eins', tags: []},
    {id: '2', type: 'podcast', slug: 'zwei', title: 'Zwei', href: '/podcasts/zwei', tags: []},
];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
    push.mockReset();
    useSearchQuery.mockReturnValue({
        results: RESULTS,
        total: RESULTS.length,
        isLoading: false,
        isValidating: false,
        effectiveQuery: '',
    });
    // jsdom does not implement scrollIntoView, which the modal calls on keyboard
    // navigation.
    Element.prototype.scrollIntoView = vi.fn();
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

function input(): HTMLInputElement {
    const el = container.querySelector('input');
    if (!el) throw new Error('search input not rendered');
    return el;
}

async function type(text: string): Promise<void> {
    const el = input();
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => {
        setValue.call(el, text);
        el.dispatchEvent(new Event('input', {bubbles: true}));
    });
}

async function press(key: string): Promise<void> {
    await act(async () => {
        input().dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true}));
    });
}

async function renderModal(onClose = vi.fn()): Promise<ReturnType<typeof vi.fn>> {
    await act(async () => {
        root.render(<SearchModal onClose={onClose} />);
    });
    return onClose;
}

function selectedTitles(): string[] {
    return Array.from(container.querySelectorAll('[role="option"][aria-selected="true"]')).map(
        (el) => el.textContent ?? '',
    );
}

describe('SearchModal keyboard interaction', () => {
    test('Escape closes the modal', async () => {
        const onClose = await renderModal();

        await press('Escape');

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('Tab moves focus from the input to the close button', async () => {
        await renderModal();
        expect(document.activeElement).toBe(input());

        await press('Tab');

        // Tabbable order follows the DOM: input, close button, result buttons.
        expect(document.activeElement).toBe(container.querySelectorAll('button')[0]);
    });

    test('Shift+Tab from the input wraps to the last tabbable element', async () => {
        await renderModal();

        await act(async () => {
            input().dispatchEvent(
                new KeyboardEvent('keydown', {key: 'Tab', shiftKey: true, bubbles: true}),
            );
        });

        const tabbables = Array.from(container.querySelectorAll('input, button'));
        expect(document.activeElement).toBe(tabbables[tabbables.length - 1]);
    });

    test('Tab from the last tabbable element wraps back to the input', async () => {
        await renderModal();
        const tabbables = Array.from(container.querySelectorAll<HTMLElement>('input, button'));
        tabbables[tabbables.length - 1]?.focus();

        await press('Tab');

        expect(document.activeElement).toBe(input());
    });

    test('ArrowDown moves the active result and Enter opens it', async () => {
        const onClose = await renderModal();

        // First result is active on arrival.
        expect(selectedTitles()[0]).toContain('Eins');

        await press('ArrowDown');
        expect(selectedTitles()[0]).toContain('Zwei');

        await press('Enter');

        expect(push).toHaveBeenCalledWith('/podcasts/zwei');
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('ArrowUp does not move above the first result', async () => {
        await renderModal();

        await press('ArrowUp');

        expect(selectedTitles()[0]).toContain('Eins');
    });

    test('Enter with no results does not navigate', async () => {
        useSearchQuery.mockReturnValue({
            results: [],
            total: 0,
            isLoading: false,
            isValidating: false,
            effectiveQuery: '',
        });
        const onClose = await renderModal();

        await press('Enter');

        expect(push).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    test('a one-character query asks the user to keep typing instead of reporting no results', async () => {
        useSearchQuery.mockReturnValue({
            results: [],
            total: 0,
            isLoading: false,
            isValidating: false,
            effectiveQuery: '',
        });
        await renderModal();

        await type('a');

        expect(container.textContent).toContain('Tippe weiter');
        expect(container.textContent).not.toContain('Keine Treffer gefunden');
    });

    test('a valid query in its debounce window shows "Suchen ..." instead of "Keine Treffer gefunden."', async () => {
        // While the debounce runs, effectiveQuery still holds the previous value and no
        // request has been issued — the status must not read as "no results".
        useSearchQuery.mockReturnValue({
            results: [],
            total: 0,
            isLoading: false,
            isValidating: false,
            effectiveQuery: '',
        });
        await renderModal();

        await type('hal');

        expect(container.textContent).toContain('Suchen ...');
        expect(container.textContent).not.toContain('Keine Treffer gefunden');
    });

    test('two or more characters with no matches report no results', async () => {
        useSearchQuery.mockReturnValue({
            results: [],
            total: 0,
            isLoading: false,
            isValidating: false,
            effectiveQuery: 'ab',
        });
        await renderModal();

        await type('ab');

        expect(container.textContent).toContain('Keine Treffer gefunden');
    });

    test('restores focus to the element that opened the modal', async () => {
        const launcher = document.createElement('button');
        launcher.textContent = 'Suche öffnen';
        document.body.appendChild(launcher);
        launcher.focus();
        expect(document.activeElement).toBe(launcher);

        await renderModal();
        // The modal focuses its input on mount.
        expect(document.activeElement).toBe(input());

        await act(async () => {
            root.unmount();
        });

        expect(document.activeElement).toBe(launcher);
        launcher.remove();
    });
});

describe('SearchModal backdrop', () => {
    test('closes when the press starts on the backdrop', async () => {
        const onClose = await renderModal();
        const backdrop = container.querySelector('[role="presentation"]');
        if (!backdrop) throw new Error('backdrop not rendered');

        await act(async () => {
            backdrop.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
        });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('does not close when the press starts inside the dialog', async () => {
        // Selecting text in the input and releasing on the backdrop produces a
        // click whose target is the backdrop. Binding to mousedown means the
        // press target decides, so the dialog stays open.
        const onClose = await renderModal();

        await act(async () => {
            input().dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
        });

        expect(onClose).not.toHaveBeenCalled();
    });
});
