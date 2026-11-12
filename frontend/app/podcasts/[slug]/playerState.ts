/**
 * Lifecycle of the Podlove embed, as one phase instead of independent
 * `scriptReady` / `playerReady` / `failed` booleans. The union makes states
 * like "failed and ready" unrepresentable.
 */
export type PlayerPhase = 'waiting-for-script' | 'booting' | 'ready' | 'fallback';

export type PlayerEvent =
    | {type: 'embed-loaded'}
    | {type: 'embed-missing'}
    | {type: 'player-ready'}
    | {type: 'player-failed'}
    | {type: 'reset'; hasEmbed: boolean};

/** A loaded embed boots immediately; otherwise the script tag must load first. */
export function initialPlayerPhase(hasEmbed: boolean): PlayerPhase {
    return hasEmbed ? 'booting' : 'waiting-for-script';
}

export function playerReducer(phase: PlayerPhase, event: PlayerEvent): PlayerPhase {
    switch (event.type) {
        case 'reset':
            return initialPlayerPhase(event.hasEmbed);
        case 'embed-loaded':
            return phase === 'waiting-for-script' ? 'booting' : phase;
        case 'embed-missing':
            return phase === 'waiting-for-script' ? 'fallback' : phase;
        case 'player-ready':
            return phase === 'booting' ? 'ready' : phase;
        case 'player-failed':
            return phase === 'waiting-for-script' || phase === 'booting' ? 'fallback' : phase;
    }
}
