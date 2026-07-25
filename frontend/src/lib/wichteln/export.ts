import {type Participant, type Assignment} from '@/app/apps/wichteln/types';

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
            const steamInfo = receiver.steamProfileUrl
                ? ` (Steam: ${receiver.steamProfileUrl})`
                : '';
            lines.push(`- **${giver.name}** → **${receiver.name}**${steamInfo}`);
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
