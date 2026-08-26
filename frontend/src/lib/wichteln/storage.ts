import {type Assignment, type Participant} from '@/app/apps/wichteln/types';

/**
 * Normalize one persisted participant record. Older app versions stored
 * `steamProfileUrl` instead of `profileUrl` and may lack participant IDs;
 * both are migrated here. Returns `null` for malformed records.
 */
function normalizeParticipant(value: unknown): Participant | null {
    if (typeof value !== 'object' || value === null) return null;
    const record = value as Record<string, unknown>;

    const {name, id, profileUrl, steamProfileUrl} = record;
    if (typeof name !== 'string' || name.trim() === '') return null;
    if (id !== undefined && (typeof id !== 'string' || id === '')) return null;

    const rawProfileUrl = profileUrl ?? steamProfileUrl;
    if (rawProfileUrl !== undefined && typeof rawProfileUrl !== 'string') return null;

    return {
        id: typeof id === 'string' ? id : crypto.randomUUID(),
        name,
        profileUrl: typeof rawProfileUrl === 'string' ? rawProfileUrl : '',
    };
}

/**
 * Validate persisted Wichteln state before hydrating it into the UI.
 *
 * Returns the normalized participants and assignments, or `null` when the
 * payload contains null/malformed participants, duplicate IDs, or assignments
 * referencing unknown participants — only fully consistent state hydrates.
 */
export function parseWichtelnStorage(value: unknown): {
    participants: Participant[];
    assignments: Assignment[];
} | null {
    if (typeof value !== 'object' || value === null) return null;
    const record = value as Record<string, unknown>;
    if (!Array.isArray(record.participants) || !Array.isArray(record.assignments)) return null;

    const participants: Participant[] = [];
    const participantIds = new Set<string>();
    for (const rawParticipant of record.participants) {
        const participant = normalizeParticipant(rawParticipant);
        if (!participant || participantIds.has(participant.id)) return null;
        participantIds.add(participant.id);
        participants.push(participant);
    }

    const assignments: Assignment[] = [];
    for (const rawAssignment of record.assignments) {
        if (typeof rawAssignment !== 'object' || rawAssignment === null) return null;
        const {giverId, receiverId} = rawAssignment as Record<string, unknown>;
        if (typeof giverId !== 'string' || typeof receiverId !== 'string') return null;
        if (!participantIds.has(giverId) || !participantIds.has(receiverId)) return null;
        assignments.push({giverId, receiverId});
    }

    return {participants, assignments};
}
