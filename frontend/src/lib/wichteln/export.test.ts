import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {generateMarkdown} from './export';

import {type Participant, type Assignment} from '@/app/apps/wichteln/types';

function makeParticipants(
    overrides: Partial<Participant>[] = []
): Participant[] {
    return overrides.map((o, i) => ({
        id: o.id ?? `id-${i}`,
        name: o.name ?? `Participant ${i}`,
        profileUrl: o.profileUrl ?? '',
    }));
}

describe('generateMarkdown', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-25T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('includes header and timestamp', () => {
        const participants = makeParticipants([{id: 'a', name: 'Alice'}]);
        const assignments: Assignment[] = [{giverId: 'a', receiverId: 'a'}];
        const result = generateMarkdown(participants, assignments);
        expect(result).toContain('# Wichteln Ergebnisse');
        expect(result).toContain('25. Juli 2026');
    });

    test('lists assignments as giver → receiver', () => {
        const participants = makeParticipants([
            {id: 'a', name: 'Alice'},
            {id: 'b', name: 'Bob'},
        ]);
        const assignments: Assignment[] = [
            {giverId: 'a', receiverId: 'b'},
            {giverId: 'b', receiverId: 'a'},
        ];
        const result = generateMarkdown(participants, assignments);
        expect(result).toContain('**Alice** → **Bob**');
        expect(result).toContain('**Bob** → **Alice**');
    });

    test('includes receiver profile URL when available', () => {
        const participants = makeParticipants([
            {id: 'a', name: 'Alice'},
            {id: 'b', name: 'Bob', profileUrl: 'https://steamcommunity.com/id/bob'},
        ]);
        const assignments: Assignment[] = [
            {giverId: 'a', receiverId: 'b'},
        ];
        const result = generateMarkdown(participants, assignments);
        expect(result).toContain('Profil: https://steamcommunity.com/id/bob');
    });

    test('includes GOG URL as profile URL', () => {
        const participants = makeParticipants([
            {id: 'a', name: 'Alice'},
            {id: 'b', name: 'Bob', profileUrl: 'https://www.gog.com/u/e_Lap'},
        ]);
        const assignments: Assignment[] = [
            {giverId: 'a', receiverId: 'b'},
        ];
        const result = generateMarkdown(participants, assignments);
        expect(result).toContain('Profil: https://www.gog.com/u/e\\_Lap');
    });

    test('omits profile URL when receiver has none', () => {
        const participants = makeParticipants([
            {id: 'a', name: 'Alice'},
            {id: 'b', name: 'Bob', profileUrl: ''},
        ]);
        const assignments: Assignment[] = [
            {giverId: 'a', receiverId: 'b'},
        ];
        const result = generateMarkdown(participants, assignments);
        expect(result).toContain('**Alice** → **Bob**');
        expect(result).not.toContain('Profil:');
    });

    test('skips assignment when participant is missing from map', () => {
        const participants = makeParticipants([{id: 'a', name: 'Alice'}]);
        const assignments: Assignment[] = [
            {giverId: 'a', receiverId: 'missing'},
        ];
        const result = generateMarkdown(participants, assignments);
        expect(result).not.toContain('Alice');
    });

    test('escapes markdown metacharacters in names', () => {
        const participants = makeParticipants([
            {id: 'a', name: 'Bob [Star] *Gamer*_01'},
            {id: 'b', name: 'Alice (Test)'},
        ]);
        const assignments: Assignment[] = [
            {giverId: 'a', receiverId: 'b'},
        ];
        const result = generateMarkdown(participants, assignments);
        expect(result).toContain('Bob \\[Star\\] \\*Gamer\\*\\_01');
        expect(result).toContain('Alice \\(Test\\)');
    });

    test('normalizes newlines in names', () => {
        const participants = makeParticipants([
            {id: 'a', name: 'Bob\nSmith'},
            {id: 'b', name: 'Alice'},
        ]);
        const assignments: Assignment[] = [
            {giverId: 'a', receiverId: 'b'},
        ];
        const result = generateMarkdown(participants, assignments);
        expect(result).toContain('Bob Smith');
    });

    test('escapes markdown metacharacters in profile URL', () => {
        const participants = makeParticipants([
            {id: 'a', name: 'Alice'},
            {id: 'b', name: 'Bob', profileUrl: 'https://example.com/a)b[x](y'},
        ]);
        const assignments: Assignment[] = [
            {giverId: 'a', receiverId: 'b'},
        ];
        const result = generateMarkdown(participants, assignments);
        expect(result).toContain(
            'Profil: https://example.com/a\\)b\\[x\\]\\(y'
        );
    });

    test('handles empty assignments', () => {
        const participants = makeParticipants([{id: 'a', name: 'Alice'}]);
        const result = generateMarkdown(participants, []);
        expect(result).toContain('# Wichteln Ergebnisse');
        expect(result).not.toContain('**Alice**');
    });
});
