// @vitest-environment jsdom
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {TableOfContentsClient} from './TableOfContentsClient';

class StubIntersectionObserver {
    static instances: StubIntersectionObserver[] = [];
    elements: Element[] = [];
    private readonly callback: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        StubIntersectionObserver.instances.push(this);
    }

    observe(element: Element) {
        this.elements.push(element);
    }

    disconnect() {}

    /** Deliver one batch, as the browser would: a delta, not a full snapshot. */
    trigger(intersecting: Element[], left: Element[] = []) {
        const entries = [
            ...intersecting.map((target) => ({target, isIntersecting: true})),
            ...left.map((target) => ({target, isIntersecting: false})),
        ];
        this.callback(entries as unknown as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
    }
}

vi.stubGlobal('IntersectionObserver', StubIntersectionObserver);

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

let content: HTMLDivElement;
let mount: HTMLDivElement;
let root: Root;

beforeEach(() => {
    StubIntersectionObserver.instances = [];
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

describe('TableOfContentsClient active heading', () => {
    const HEADINGS = [
        {text: 'Intro', depth: 2},
        {text: 'Teil', depth: 2},
        {text: 'Intro', depth: 2},
        {text: 'Fazit', depth: 2},
    ];

    async function renderToc(headings = HEADINGS) {
        await act(async () => {
            root.render(<TableOfContentsClient headings={headings} />);
        });
        const observer = StubIntersectionObserver.instances.at(-1);
        if (!observer) throw new Error('no observer created');
        return observer;
    }

    function activeText(): string | null {
        return mount.querySelector('[aria-current="location"]')?.textContent ?? null;
    }

    test('keeps the topmost heading active when a second one becomes visible', async () => {
        // The callback receives only changed targets, so the second heading's
        // entry must not steal the highlight from the first one still on screen.
        const observer = await renderToc();
        const [intro, teil] = observer.elements;

        await act(async () => observer.trigger([intro]));
        expect(activeText()).toBe('Intro');

        await act(async () => observer.trigger([teil]));
        expect(activeText()).toBe('Intro');

        await act(async () => observer.trigger([], [intro]));
        expect(activeText()).toBe('Teil');
    });

    test('drops the previous active entry when the heading set changes', async () => {
        // Client-side navigation reuses this component instance; the new article's
        // first observer batch can be empty when no heading is in the band yet.
        let observer = await renderToc();
        await act(async () => observer.trigger([observer.elements[1]]));
        expect(activeText()).toBe('Teil');

        observer = await renderToc([
            {text: 'Intro', depth: 2},
            {text: 'Teil', depth: 2},
        ]);
        await act(async () => observer.trigger([], observer.elements));

        expect(activeText()).toBeNull();
    });
});
