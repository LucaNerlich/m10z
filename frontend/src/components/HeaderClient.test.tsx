// @vitest-environment jsdom
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

vi.mock('next/navigation', () => ({usePathname: () => '/'}));
vi.mock('next/link', () => ({
    default: ({href, children, ...rest}: {href: string; children: import('react').ReactNode}) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

import HeaderClient from './HeaderClient';

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let input: HTMLInputElement;

beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    input = document.createElement('input');
    document.body.appendChild(input);
    root = createRoot(container);
    await act(async () => {
        root.render(<HeaderClient primaryLinks={[{label: 'Start', href: '/'}]} secondaryLinks={[]} />);
    });
});

afterEach(async () => {
    await act(async () => {
        root.unmount();
    });
    container.remove();
    input.remove();
});

function menuButton(): HTMLButtonElement {
    const button = container.querySelector<HTMLButtonElement>('button[aria-expanded]');
    expect(button).not.toBeNull();
    return button as HTMLButtonElement;
}

async function pressMenuShortcut(target: EventTarget) {
    await act(async () => {
        target.dispatchEvent(new KeyboardEvent('keydown', {key: 'j', metaKey: true, bubbles: true}));
    });
}

describe('HeaderClient menu shortcut', () => {
    test('ignores Cmd/Ctrl+J while typing in a text field', async () => {
        await pressMenuShortcut(input);
        expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    });

    test('toggles the menu when the shortcut is not aimed at an editable field', async () => {
        await pressMenuShortcut(document.body);
        expect(menuButton().getAttribute('aria-expanded')).toBe('true');
    });
});

describe('HeaderClient menu focus', () => {
    async function openMenu() {
        await pressMenuShortcut(document.body);
        // The open effect focuses the first focusable element on a zero timeout
        // (the burger, which precedes the links in the wrapper).
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        expect(menuButton().getAttribute('aria-expanded')).toBe('true');
    }

    test('a click outside keeps focus on the clicked control', async () => {
        await openMenu();
        input.focus();

        await act(async () => {
            input.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
        });

        expect(menuButton().getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).toBe(input);
    });

    test('Escape returns focus to the burger', async () => {
        await openMenu();
        // Focus must be inside the menu, otherwise the restore branch is a no-op
        // and the assertion could not fail if it were removed.
        const menuLink = container.querySelector<HTMLAnchorElement>('a[href="/"]');
        expect(menuLink).not.toBeNull();
        menuLink?.focus();

        await act(async () => {
            document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
        });

        expect(menuButton().getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).toBe(menuButton());
    });
});

describe('HeaderClient menu label', () => {
    test('the button name does not contradict its expanded state', async () => {
        const button = menuButton();
        expect(button.getAttribute('aria-label')).toBe('Menü');
        expect(button.getAttribute('aria-expanded')).toBe('false');

        await pressMenuShortcut(document.body);

        expect(menuButton().getAttribute('aria-label')).toBe('Menü');
        expect(menuButton().getAttribute('aria-expanded')).toBe('true');
    });
});
