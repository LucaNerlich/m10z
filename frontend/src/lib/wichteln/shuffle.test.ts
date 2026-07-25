import {describe, expect, test} from 'vitest';

import {shuffleAndAssign} from './shuffle';

import {type Participant} from '@/app/apps/wichteln/types';

function makeParticipants(names: string[]): Participant[] {
    return names.map((name) => ({
        id: crypto.randomUUID(),
        name,
        steamProfileUrl: '',
    }));
}

describe('shuffleAndAssign', () => {
    test('returns correct number of assignments', () => {
        const participants = makeParticipants(['Alice', 'Bob', 'Charlie']);
        const result = shuffleAndAssign(participants);
        expect(result).toHaveLength(3);
    });

    test('creates a circular derangement (no self-assignments)', () => {
        const participants = makeParticipants(['Alice', 'Bob', 'Charlie', 'Diana']);
        const result = shuffleAndAssign(participants);
        for (const a of result) {
            expect(a.giverId).not.toBe(a.receiverId);
        }
    });

    test('every participant appears exactly once as giver', () => {
        const participants = makeParticipants(['Alice', 'Bob', 'Charlie']);
        const result = shuffleAndAssign(participants);
        const giverIds = result.map((a) => a.giverId).sort();
        const expectedIds = participants.map((p) => p.id).sort();
        expect(giverIds).toEqual(expectedIds);
    });

    test('every participant appears exactly once as receiver', () => {
        const participants = makeParticipants(['Alice', 'Bob', 'Charlie']);
        const result = shuffleAndAssign(participants);
        const receiverIds = result.map((a) => a.receiverId).sort();
        const expectedIds = participants.map((p) => p.id).sort();
        expect(receiverIds).toEqual(expectedIds);
    });

    test('creates a single cycle (no disjoint subsets)', () => {
        const participants = makeParticipants(['Alice', 'Bob', 'Charlie', 'Diana']);
        const result = shuffleAndAssign(participants);

        const assignmentMap = new Map(result.map((a) => [a.giverId, a.receiverId]));
        const visited = new Set<string>();
        let current = participants[0].id;
        for (let i = 0; i < participants.length; i++) {
            visited.add(current);
            const next = assignmentMap.get(current);
            expect(next).toBeDefined();
            current = next!;
        }
        expect(visited.size).toBe(participants.length);
    });

    test('throws for less than 2 participants', () => {
        expect(() => shuffleAndAssign(makeParticipants([]))).toThrow(
            'Need at least 2 participants'
        );
        expect(() => shuffleAndAssign(makeParticipants(['Alice']))).toThrow(
            'Need at least 2 participants'
        );
    });

    test('handles 2 participants correctly', () => {
        const participants = makeParticipants(['Alice', 'Bob']);
        const result = shuffleAndAssign(participants);
        expect(result).toHaveLength(2);
        expect(result[0].giverId).toBe(result[1].receiverId);
        expect(result[0].receiverId).toBe(result[1].giverId);
    });

    test('produces different results across runs (probabilistic)', () => {
        const participants = makeParticipants(['Alice', 'Bob', 'Charlie', 'Diana']);
        const results = new Set<string>();
        for (let i = 0; i < 20; i++) {
            const result = shuffleAndAssign(participants);
            results.add(JSON.stringify(result));
        }
        expect(results.size).toBeGreaterThan(1);
    });
});
