import {type Participant, type Assignment} from '@/app/apps/wichteln/types';

const UINT32_MAX = 0x100000000;

/**
 * Cryptographically secure uniform integer in [0, maxExclusive).
 * Uses rejection sampling to avoid the modulo bias of naive
 * `getRandomValues(...) % maxExclusive`.
 */
function randomInt(maxExclusive: number): number {
    const limit = Math.floor(UINT32_MAX / maxExclusive) * maxExclusive;
    const buf = new Uint32Array(1);
    let value: number;
    do {
        crypto.getRandomValues(buf);
        value = buf[0];
    } while (value >= limit);
    return value % maxExclusive;
}

function fisherYatesShuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function shuffleAndAssign(participants: Participant[]): Assignment[] {
    if (participants.length < 2) {
        throw new Error('Need at least 2 participants');
    }

    // The circular construction (receiver = next in the shuffled cycle) is a
    // valid derangement for n >= 2 by construction — no retry loop needed.
    const shuffled = fisherYatesShuffle(participants.map((p) => p.id));
    const assignments: Assignment[] = [];
    for (let i = 0; i < shuffled.length; i++) {
        const nextIndex = (i + 1) % shuffled.length;
        const giverId = shuffled[i];
        const receiverId = shuffled[nextIndex];
        if (giverId === undefined || receiverId === undefined) continue;
        assignments.push({giverId, receiverId});
    }

    return assignments;
}
