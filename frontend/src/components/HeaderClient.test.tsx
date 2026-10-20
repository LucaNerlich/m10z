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
