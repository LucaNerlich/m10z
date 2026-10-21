// @vitest-environment jsdom
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {TableOfContentsClient} from './TableOfContentsClient';

class StubIntersectionObserver {
    observe() {}
    disconnect() {}
}

vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

let content: HTMLDivElement;
let mount: HTMLDivElement;
let root: Root;

beforeEach(() => {
    content = document.createElement('div');
    content.className = 'markdown-content';
    content.innerHTML = [
        '<h2 id="intro">Intro</h2>',
        '<h2 id="teil">Teil</h2>',
        '<h2 id="intro-1">Intro</h2>',
        '<h2 id="fazit">Fazit</h2>',
    ].join('');
    document.body.appendChild(content);

    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
});

afterEach(async () => {
    await act(async () => {
        root.unmount();
    });
    content.remove();
    mount.remove();
});

describe('TableOfContentsClient heading resolution', () => {
    test('repeated heading text resolves to its own duplicated DOM id', async () => {
        await act(async () => {
            root.render(
                <TableOfContentsClient
                    headings={[
                        {text: 'Intro', depth: 2},
                        {text: 'Teil', depth: 2},
                        {text: 'Intro', depth: 2},
                        {text: 'Fazit', depth: 2},
                    ]}
                />,
            );
        });

        const hrefs = Array.from(mount.querySelectorAll('a')).map((a) => a.getAttribute('href'));
        expect(hrefs).toEqual(['#intro', '#teil', '#intro-1', '#fazit']);
    });
});
