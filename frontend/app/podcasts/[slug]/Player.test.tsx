// @vitest-environment jsdom
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import type {PodloveEpisodeConfig, PodlovePlayerConfig} from '@/src/lib/podlove/types';

vi.mock('next/script', async () => {
    const React = await import('react');
    return {
        // Fire onReady once so the test drives the real script-ready transition.
        default: ({onReady}: {onReady?: () => void}) => {
            React.useEffect(() => {
                onReady?.();
            }, []);
            return null;
        },
    };
});

import {PodcastPlayer} from './Player';

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

const EPISODE = {
    audio: [{url: 'https://example.com/episode.mp3', mimeType: 'audio/mpeg'}],
} as PodloveEpisodeConfig;
const CONFIG = {} as PodlovePlayerConfig;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
    delete window.podlovePlayer;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => {
        root.unmount();
    });
    container.remove();
    delete window.podlovePlayer;
});

async function render(episode: PodloveEpisodeConfig | null = EPISODE): Promise<void> {
    await act(async () => {
        root.render(<PodcastPlayer episode={episode} config={CONFIG} />);
    });
}

async function settle(): Promise<void> {
    await act(async () => {
        await Promise.resolve();
    });
}

function embedMock() {
    return vi.fn(
        async (_element: string | HTMLElement, _episode: unknown, _config: unknown) => ({} as never),
    );
}

describe('PodcastPlayer', () => {
    test('renders nothing without an episode', async () => {
        await render(null);

        expect(container.innerHTML).toBe('');
    });

    test('falls back when the script loads without the embed global', async () => {
        await render();
        await settle();

        expect(container.querySelector('audio')).not.toBeNull();
        expect(container.querySelector('[aria-busy]')).toBeNull();
    });

    test('mounts the embed and marks the player ready', async () => {
        const embed = embedMock();
        window.podlovePlayer = embed;

        await render();
        await settle();

        expect(embed).toHaveBeenCalledTimes(1);
        expect(embed.mock.calls[0]?.[0]).toBeInstanceOf(HTMLElement);
        expect(container.querySelector('[aria-busy="false"]')).not.toBeNull();
        expect(container.querySelector('audio')).toBeNull();
    });

    test('remounts the embed when the episode changes', async () => {
        const embed = embedMock();
        window.podlovePlayer = embed;

        await render();
        await settle();
        expect(embed).toHaveBeenCalledTimes(1);

        await render({...EPISODE, audio: [{url: 'https://example.com/next.mp3', mimeType: 'audio/mpeg'}]});
        await settle();

        expect(embed).toHaveBeenCalledTimes(2);
        expect(container.querySelector('[aria-busy="false"]')).not.toBeNull();
    });

    test('falls back when the embed bootstrap rejects', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        window.podlovePlayer = vi.fn(async () => {
            throw new Error('bootstrap failed');
        });

        await render();
        await settle();
        await settle();

        expect(container.querySelector('audio')).not.toBeNull();
        expect(consoleError).toHaveBeenCalled();
        consoleError.mockRestore();
    });
});
