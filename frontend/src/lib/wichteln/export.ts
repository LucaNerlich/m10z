import {type Participant, type Assignment} from '@/app/apps/wichteln/types';

function escapeMarkdown(value: string): string {
    return value
        .replace(/\r?\n/g, ' ')
        .replace(/[\\`*_{}[\]()#+\-!]/g, '\\$&');
}

export function generateMarkdown(
    participants: Participant[],
    assignments: Assignment[]
): string {
    const participantMap = new Map(participants.map((p) => [p.id, p]));

    const lines: string[] = [];
    lines.push('# Wichteln Ergebnisse');
    lines.push('');
    lines.push(
        `Erstellt am: ${new Date().toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })}`
    );
    lines.push('');
    lines.push('## Zuordnungen');
    lines.push('');

    for (const assignment of assignments) {
        const giver = participantMap.get(assignment.giverId);
        const receiver = participantMap.get(assignment.receiverId);
        if (giver && receiver) {
            const profileInfo = receiver.profileUrl
                ? ` (Profil: ${escapeMarkdown(receiver.profileUrl)})`
                : '';
            lines.push(
                `- **${escapeMarkdown(giver.name)}** → **${escapeMarkdown(receiver.name)}**${profileInfo}`
            );
        }
    }

    lines.push('');
    return lines.join('\n');
}

export function downloadMarkdown(
    participants: Participant[],
    assignments: Assignment[]
): void {
    const markdown = generateMarkdown(participants, assignments);
    const blob = new Blob([markdown], {type: 'text/markdown;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `wichteln-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

/**
 * Generate a Markdown document containing ONLY the given giver's own
 * assignment — safe to send to that participant without revealing the
 * complete pairing list.
 */
export function generateMarkdownForGiver(
    participants: Participant[],
    assignments: Assignment[],
    giverId: string
): string {
    const participantMap = new Map(participants.map((p) => [p.id, p]));
    const assignment = assignments.find((a) => a.giverId === giverId);
    const giver = participantMap.get(giverId);
    const receiver = assignment ? participantMap.get(assignment.receiverId) : undefined;
    if (!giver || !receiver) return '';

    const lines: string[] = [];
    lines.push('# Dein Wichtel-Geschenk');
    lines.push('');
    lines.push(`Hallo ${escapeMarkdown(giver.name)},`);
    lines.push('');
    lines.push('Du beschenkst:');
    lines.push('');
    const profileInfo = receiver.profileUrl
        ? ` (Profil: ${escapeMarkdown(receiver.profileUrl)})`
        : '';
    lines.push(`- **${escapeMarkdown(receiver.name)}**${profileInfo}`);
    lines.push('');
    lines.push('Bitte niemandem verraten!');
    lines.push('');
    return lines.join('\n');
}

/**
 * Download a per-participant Markdown file containing only the giver's own
 * assignment.
 */
export function downloadMarkdownForGiver(
    participants: Participant[],
    assignments: Assignment[],
    giverId: string
): void {
    const markdown = generateMarkdownForGiver(participants, assignments, giverId);
    const blob = new Blob([markdown], {type: 'text/markdown;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const giver = participants.find((p) => p.id === giverId);
    const safeName = (giver?.name ?? 'teilnehmer').replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/^-|-$/g, '');
    anchor.download = `wichteln-${safeName || 'teilnehmer'}-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}
