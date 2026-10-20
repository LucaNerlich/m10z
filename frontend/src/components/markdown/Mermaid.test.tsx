// @vitest-environment jsdom
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

const {renderMock, initializeMock} = vi.hoisted(() => ({
    renderMock: vi.fn(),
    initializeMock: vi.fn(),
}));

vi.mock('mermaid', () => ({default: {initialize: initializeMock, render: renderMock}}));
vi.mock('@/src/lib/analytics/umami', () => ({umamiEventId: (parts: string[]) => parts.join(':')}));
vi.mock('@/src/lib/markdown/mermaidSvg', () => ({
    mermaidSvgToDataUrl: (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`,
}));

import {Mermaid} from './Mermaid';

// React 19 warns unless it knows the test environment drives `act`.
(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
    renderMock.mockReset();
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

function pendingResolvers() {
    const resolvers: Array<(value: {svg: string}) => void> = [];
    renderMock.mockImplementation(() => new Promise<{svg: string}>((resolve) => resolvers.push(resolve)));
    return resolvers;
}

describe('Mermaid', () => {
    test('a superseded render does not overwrite the newer diagram', async () => {
        const resolvers = pendingResolvers();

        await act(async () => {
            root.render(<Mermaid chart='graph A' />);
        });
        expect(renderMock).toHaveBeenCalledTimes(1);

        // The chart prop changes while run 1 is still in flight.
        await act(async () => {
            root.render(<Mermaid chart='graph B' />);
        });
        expect(renderMock).toHaveBeenCalledTimes(2);

        // The newer run resolves first, then the stale one lands.
        await act(async () => {
            resolvers[1]!({svg: '<svg id="B"></svg>'});
        });
        await act(async () => {
            resolvers[0]!({svg: '<svg id="A"></svg>'});
        });

        expect(container.innerHTML).toContain('id="B"');
        expect(container.innerHTML).not.toContain('id="A"');
    });

    test('renders a single diagram when nothing supersedes it', async () => {
        renderMock.mockResolvedValue({svg: '<svg id="only"></svg>'});

        await act(async () => {
            root.render(<Mermaid chart='graph A' />);
        });

        expect(renderMock).toHaveBeenCalledTimes(1);
        expect(container.innerHTML).toContain('id="only"');
    });

    test('a superseded run that fails does not put the fresh diagram into an error state', async () => {
        const resolvers: Array<{resolve: (value: {svg: string}) => void; reject: (reason: Error) => void}> = [];
        renderMock.mockImplementation(
            () =>
                new Promise<{svg: string}>((resolve, reject) => {
                    resolvers.push({resolve, reject});
                }),
        );

        await act(async () => {
            root.render(<Mermaid chart='graph A' />);
        });
        await act(async () => {
            root.render(<Mermaid chart='graph B' />);
        });

        await act(async () => {
            resolvers[1]!.resolve({svg: '<svg id="B"></svg>'});
        });
        // The stale run then fails; it must not replace the good diagram.
        await act(async () => {
            resolvers[0]!.reject(new Error('stale failure'));
        });

        expect(container.innerHTML).toContain('id="B"');
        expect(container.innerHTML).not.toContain('Failed to render');
    });

    test('recovers when a failing chart is replaced by a valid one', async () => {
        renderMock.mockRejectedValueOnce(new Error('bad chart'));
        renderMock.mockResolvedValueOnce({svg: '<svg id="good"></svg>'});

        await act(async () => {
            root.render(<Mermaid chart='graph bad' />);
        });
        expect(container.innerHTML).toContain('Failed to render');

        await act(async () => {
            root.render(<Mermaid chart='graph good' />);
        });

        expect(renderMock).toHaveBeenCalledTimes(2);
        expect(container.innerHTML).toContain('id="good"');
        expect(container.innerHTML).not.toContain('Failed to render');
    });
});
