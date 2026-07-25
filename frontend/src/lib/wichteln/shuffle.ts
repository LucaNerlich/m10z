import {type Participant, type Assignment} from '@/app/apps/wichteln/types';

function fisherYatesShuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function isValidDerangement(assignments: Assignment[]): boolean {
    return assignments.every((a) => a.giverId !== a.receiverId);
}

export function shuffleAndAssign(participants: Participant[]): Assignment[] {
    if (participants.length < 2) {
        throw new Error('Need at least 2 participants');
    }

    const ids = participants.map((p) => p.id);
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const shuffled = fisherYatesShuffle(ids);
        const assignments: Assignment[] = [];
        for (let i = 0; i < shuffled.length; i++) {
            const nextIndex = (i + 1) % shuffled.length;
            assignments.push({
                giverId: shuffled[i],
                receiverId: shuffled[nextIndex],
            });
        }

        if (isValidDerangement(assignments)) {
            return assignments;
        }
    }

    throw new Error('Could not create valid assignments. Try adding more participants.');
}
