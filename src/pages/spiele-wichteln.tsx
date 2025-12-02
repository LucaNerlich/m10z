import React, {useRef, useEffect, useState, useCallback} from 'react';
// @ts-ignore
import Layout from '@theme/Layout';
import './wichteln/spiele-wichteln.css';

interface Participant {
    name: string;
    link: string; // main gaming platform, such as steam profile page
    link2?: string; // optional second gaming platform
    notes?: string; // optional notes/hints (e.g., "I only play on Mac", "I don't like genre XYZ")
    id: string; // unique identifier for editing/removing
}

interface Pair {
    sender: Participant;
    receiver: Participant;
}

interface ToastMessage {
    id: string;
    message: string;
    type: 'success' | 'error';
}

/**
 * Shuffles the elements of an array in place using the Fisher-Yates algorithm.
 *
 * @param {Array} array - The array to be shuffled. The array is modified in place.
 * @return {Array} The shuffled array.
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i >= 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
    }
    return shuffled;
}

/**
 * Validates and sanitizes a URL
 */
function validateUrl(url: string): boolean {
    try {
        const urlObj = new URL(url);
        // Only allow http and https protocols
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

const STORAGE_KEY = 'spiele-wichteln-participants';
const randomNames = [
    'Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Mallory', 'Trent', 'Oscar',
    'Victor', 'Wendy', 'Xavier', 'Yolanda', 'Zara', 'Adam', 'Beth', 'Caleb',
    'Diana', 'Edward', 'Fiona', 'George', 'Hannah', 'Ivy', 'Jack', 'Kelly',
    'Liam', 'Mia', 'Noah', 'Olivia', 'Peter', 'Quinn', 'Riley', 'Sophia',
    'Thomas', 'Ursula', 'Vincent', 'Willow', 'Xavier', 'Yasmine', 'Zachary',
];

export default function SpieleWichtelnPage(): React.ReactElement {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [pairs, setPairs] = useState<Pair[]>([]);
    const [newPlayer, setNewPlayer] = useState<Participant>({name: '', link: '', link2: '', notes: '', id: ''});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [bulkImportText, setBulkImportText] = useState<string>('');
    const discourseRef = useRef<HTMLPreElement>(null);
    const phpRef = useRef<HTMLPreElement>(null);
    const textRef = useRef<HTMLDivElement>(null);

    // Load participants from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as Participant[];
                setParticipants(parsed);
            }
        } catch (error) {
            console.error('Failed to load participants from localStorage:', error);
        }
    }, []);

    // Save participants to localStorage whenever they change
    useEffect(() => {
        try {
            if (participants.length > 0) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (error) {
            console.error('Failed to save participants to localStorage:', error);
        }
    }, [participants]);

    // Show toast notification
    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, {id, message, type}]);
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, 3000);
    }, []);


    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (participants.length < 2) {
            showToast('Mindestens 2 TeilnehmerInnen erforderlich', 'error');
            return;
        }

        // shuffle cloned participant list
        const shuffledParticipants = shuffleArray(participants);

        // create circular pairing
        const newPairs: Pair[] = shuffledParticipants.map((participant, index) => {
            // pick the next player from the shuffled array, if the end is reached, pick index 0
            // e.g (4 + 1) % 5 = 0
            return {
                sender: participant,
                receiver: shuffledParticipants[(index + 1) % shuffledParticipants.length]
            };
        });

        setPairs(newPairs);
        showToast('Paare erfolgreich ausgelost! 🎉');
    };

    const copyToClipboard = async (ref: React.RefObject<HTMLPreElement | HTMLDivElement>, format: string) => {
        if (ref.current) {
            let textToCopy: string;
            
            // For text format (div), generate a cleaner plain text version
            if (format === 'Text' && ref.current instanceof HTMLDivElement) {
                const lines: string[] = ['🎮 Spiele-Wichteln Paarungen', ''];
                pairs.forEach((pair, index) => {
                    lines.push(`${index + 1}. ${pair.sender.name} bewichtelt ${pair.receiver.name}`);
                    lines.push(`   👤 Sender: ${pair.sender.name} (${pair.sender.link})`);
                    if (pair.sender.link2) {
                        lines.push(`      Zweite Plattform: ${pair.sender.link2}`);
                    }
                    lines.push(`   🎁 Empfänger: ${pair.receiver.name} (${pair.receiver.link})`);
                    if (pair.receiver.link2) {
                        lines.push(`      Zweite Plattform: ${pair.receiver.link2}`);
                    }
                    if (pair.receiver.notes) {
                        lines.push(`   💡 Hinweis: ${pair.receiver.notes}`);
                    }
                    if (index < pairs.length - 1) {
                        lines.push('');
                    }
                });
                textToCopy = lines.join('\n');
            } else {
                textToCopy = ref.current.innerText || ref.current.textContent || '';
            }
            
            if (textToCopy) {
                try {
                    await navigator.clipboard.writeText(textToCopy);
                    showToast(`${format} Format in Zwischenablage kopiert!`);
                } catch (err) {
                    console.error('Fehler beim Kopieren in die Zwischenablage:', err);
                    showToast('Fehler beim Kopieren', 'error');
                }
            }
        }
    };

    const addParticipant = () => {
        if (!newPlayer.name.trim()) {
            showToast('Bitte einen Namen eingeben', 'error');
            return;
        }
        if (!newPlayer.link.trim() || !validateUrl(newPlayer.link)) {
            showToast('Bitte eine gültige URL eingeben (http:// oder https://)', 'error');
            return;
        }
        // Validate second link if provided
        if (newPlayer.link2 && newPlayer.link2.trim() && !validateUrl(newPlayer.link2)) {
            showToast('Bitte eine gültige URL für die zweite Plattform eingeben', 'error');
            return;
        }

        const participant: Participant = {
            name: newPlayer.name.trim(),
            link: newPlayer.link.trim(),
            link2: newPlayer.link2?.trim() || undefined,
            notes: newPlayer.notes?.trim() || undefined,
            id: editingId || Date.now().toString()
        };

        if (editingId) {
            setParticipants(prev => prev.map(p => p.id === editingId ? participant : p));
            setEditingId(null);
            showToast('TeilnehmerIn aktualisiert');
        } else {
            setParticipants(prev => [...prev, participant]);
            showToast('TeilnehmerIn hinzugefügt');
        }

        setNewPlayer({name: '', link: '', link2: '', notes: '', id: ''});
        setPairs([]); // Clear pairs when participants change
    };

    const removeParticipant = (id: string) => {
        setParticipants(prev => prev.filter(p => p.id !== id));
        setPairs([]); // Clear pairs when participants change
        showToast('TeilnehmerIn entfernt');
    };

    const startEdit = (participant: Participant) => {
        setNewPlayer(participant);
        setEditingId(participant.id);
    };

    const cancelEdit = () => {
        setNewPlayer({name: '', link: '', link2: '', notes: '', id: ''});
        setEditingId(null);
    };

    const loadDemoData = () => {
        const shuffledNames = shuffleArray([...randomNames]);
        const randomLinks = shuffledNames
            .slice(0, 7)
            .map(name => `https://steamcommunity.com/id/${name.toLowerCase()}`);
        const randomLinks2 = shuffledNames
            .slice(0, 7)
            .map(name => `https://www.epicgames.com/store/en-US/profile/${name.toLowerCase()}`);
        const randomNotes = [
            'Spiele nur auf Mac',
            'Keine Horror-Spiele bitte',
            'Liebe Indie-Games',
            'Bevorzuge Strategie-Spiele',
            '',
            'Nur Multiplayer-Games',
            ''
        ];
        const randomParticipants: Participant[] = shuffledNames
            .slice(0, 7)
            .map((name, index) => ({
                name,
                link: randomLinks[index],
                link2: index % 2 === 0 ? randomLinks2[index] : undefined, // Some have second platform
                notes: randomNotes[index] || undefined,
                id: `demo-${index}`
            }));
        setParticipants(randomParticipants);
        setPairs([]);
        showToast('Demo-Daten geladen');
    };

    const resetAll = () => {
        setParticipants([]);
        setPairs([]);
        setNewPlayer({name: '', link: '', link2: '', notes: '', id: ''});
        setEditingId(null);
        localStorage.removeItem(STORAGE_KEY);
        showToast('Alle Daten zurückgesetzt');
    };

    const bulkImportParticipants = () => {
        if (!bulkImportText.trim()) {
            showToast('Bitte Text zum Importieren eingeben', 'error');
            return;
        }

        // Parse markdown links: [Name](URL) with optional list marker
        const markdownLinkRegex = /^\s*(?:\*|\d+\.|\-)?\s*\[([^\]]+)\]\(([^)]+)\)\s*$/;
        const lines = bulkImportText.split('\n');
        const newParticipants: Participant[] = [];
        const errors: string[] = [];

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return; // Skip empty lines

            const match = trimmedLine.match(markdownLinkRegex);
            if (match) {
                const [, name, link] = match;
                if (name.trim() && link.trim()) {
                    if (validateUrl(link.trim())) {
                        newParticipants.push({
                            name: name.trim(),
                            link: link.trim(),
                            id: `bulk-${Date.now()}-${index}`
                        });
                    } else {
                        errors.push(`Zeile ${index + 1}: Ungültige URL`);
                    }
                } else {
                    errors.push(`Zeile ${index + 1}: Name oder URL fehlt`);
                }
            } else {
                errors.push(`Zeile ${index + 1}: Ungültiges Format`);
            }
        });

        if (newParticipants.length === 0) {
            showToast('Keine gültigen Einträge gefunden', 'error');
            return;
        }

        setParticipants(prev => [...prev, ...newParticipants]);
        setPairs([]); // Clear pairs when participants change
        setBulkImportText('');

        if (errors.length > 0) {
            showToast(`${newParticipants.length} SpielerInnen importiert, ${errors.length} Fehler`, 'error');
        } else {
            showToast(`${newParticipants.length} SpielerInnen erfolgreich importiert`);
        }
    };

    return (
        <Layout title='Spiele-Wichteln' description='Web App zum Auslosen von Wichteln-Paaren'>
            <div className='wrapper'>
                {/* Toast notifications */}
                <div className='toast-container' aria-live='polite' aria-atomic='true'>
                    {toasts.map(toast => (
                        <div key={toast.id} className={`toast toast-${toast.type}`}>
                            {toast.message}
                        </div>
                    ))}
                </div>

                <h1>Spiele-Wichteln Auslosungs App</h1>
                
                <form className='addParticipantForm' onSubmit={(e) => { e.preventDefault(); addParticipant(); }}>
                    <fieldset>
                        <legend>{editingId ? 'TeilnehmerIn bearbeiten' : 'Neue/r SpielerIn'}</legend>
                        <label htmlFor='participant-name'>
                            Name
                            <input
                                id='participant-name'
                                type='text'
                                name='name'
                                required
                                placeholder='Luca'
                                value={newPlayer.name}
                                onChange={(event) => setNewPlayer({...newPlayer, name: event.target.value})}
                                aria-label='Name des Teilnehmers'
                            />
                        </label>
                    </fieldset>
                    <fieldset>
                        <legend>Profil Link (Steam o. Ä.)</legend>
                        <label htmlFor='participant-link'>
                            URL
                            <input
                                id='participant-link'
                                type='url'
                                pattern='https?://.*'
                                required
                                name='link'
                                placeholder='https://steamcommunity.com/id/gabelogannewell'
                                value={newPlayer.link}
                                onChange={(event) => setNewPlayer({...newPlayer, link: event.target.value})}
                                aria-label='Profil-Link des Teilnehmers'
                            />
                        </label>
                    </fieldset>
                    <fieldset>
                        <legend>Zweite Gaming-Plattform (optional)</legend>
                        <label htmlFor='participant-link2'>
                            URL
                            <input
                                id='participant-link2'
                                type='url'
                                pattern='https?://.*'
                                name='link2'
                                placeholder='https://www.epicgames.com/store/en-US/profile/...'
                                value={newPlayer.link2 || ''}
                                onChange={(event) => setNewPlayer({...newPlayer, link2: event.target.value})}
                                aria-label='Zweiter Profil-Link des Teilnehmers (optional)'
                            />
                        </label>
                    </fieldset>
                    <fieldset>
                        <legend>Notizen / Hinweise (optional)</legend>
                        <label htmlFor='participant-notes'>
                            Hinweise für deine:n Wichtel-Partner:in
                            <textarea
                                id='participant-notes'
                                name='notes'
                                rows={3}
                                placeholder='z.B. "Ich spiele nur auf Mac", "Keine Horror-Spiele bitte", "Liebe Indie-Games"'
                                value={newPlayer.notes || ''}
                                onChange={(event) => setNewPlayer({...newPlayer, notes: event.target.value})}
                                aria-label='Notizen und Hinweise (optional)'
                            />
                        </label>
                    </fieldset>

                    <div className='form-actions'>
                        <button 
                            type='submit'
                            disabled={!newPlayer.name.trim() || !newPlayer.link.trim()}
                            aria-label={editingId ? 'Änderungen speichern' : 'TeilnehmerIn hinzufügen'}
                        >
                            {editingId ? '✓ Speichern' : '+ SpielerIn hinzufügen'}
                        </button>
                        {editingId && (
                            <button 
                                type='button'
                                onClick={cancelEdit}
                                className='button-secondary'
                                aria-label='Bearbeitung abbrechen'
                            >
                                Abbrechen
                            </button>
                        )}
                    </div>
                </form>

                <div className='bulk-import-section'>
                    <fieldset>
                        <legend>🔽 Mehrere SpielerInnen auf einmal importieren</legend>
                        <label htmlFor='bulk-import'>
                            Markdown-Liste einfügen (mit oder ohne * am Anfang)
                            <textarea
                                id='bulk-import'
                                rows={8}
                                placeholder={'* [Georg](https://steamcommunity.com/profiles/76561198036517709/)\n* [SZ](https://steamcommunity.com/id/calyampudi)\n* [Luca](https://steamcommunity.com/id/e_Lap)'}
                                value={bulkImportText}
                                onChange={(e) => setBulkImportText(e.target.value)}
                                aria-label='Bulk import text area'
                            />
                        </label>
                        <button
                            type='button'
                            onClick={bulkImportParticipants}
                            disabled={!bulkImportText.trim()}
                            aria-label='SpielerInnen importieren'
                        >
                            📥 Importieren
                        </button>
                    </fieldset>
                </div>

                <form className='participantsForm' onSubmit={handleSubmit}>
                    <fieldset>
                        <div className='action-buttons'>
                            <button
                                type='submit'
                                disabled={participants.length < 2}
                                aria-label='Paare auslosen'
                            >
                                🪄 Paare auslosen
                            </button>
                            <button
                                type='button'
                                disabled={participants.length > 0}
                                onClick={loadDemoData}
                                className='button-secondary'
                                aria-label='Demo-Daten laden'
                            >
                                🧪 Demo Modus
                            </button>
                            <button
                                type='button'
                                disabled={participants.length === 0}
                                onClick={resetAll}
                                className='button-danger'
                                aria-label='Alle Daten zurücksetzen'
                            >
                                ⚠️ Reset
                            </button>
                        </div>
                    </fieldset>

                    {participants.length > 0 && (
                        <>
                            <h2 style={{marginTop: '1rem'}}>TeilnehmerInnen ({participants.length})</h2>
                            <ul className='participants-list'>
                                {participants.map((participant) => (
                                    <li key={participant.id} className='participant-item'>
                                        <div className='participant-info'>
                                            <div className='participant-name-row'>
                                                <a 
                                                    href={participant.link} 
                                                    target='_blank' 
                                                    rel='noopener noreferrer'
                                                    aria-label={`${participant.name} Profil öffnen`}
                                                >
                                                    {participant.name}
                                                </a>
                                                {participant.link2 && (
                                                    <a 
                                                        href={participant.link2} 
                                                        target='_blank' 
                                                        rel='noopener noreferrer'
                                                        className='participant-link2'
                                                        aria-label={`${participant.name} zweites Profil öffnen`}
                                                        title='Zweite Plattform'
                                                    >
                                                        🔗
                                                    </a>
                                                )}
                                            </div>
                                            {participant.notes && (
                                                <div className='participant-notes'>
                                                    💡 {participant.notes}
                                                </div>
                                            )}
                                        </div>
                                        <div className='participant-actions'>
                                            <button
                                                type='button'
                                                onClick={() => startEdit(participant)}
                                                className='button-icon'
                                                aria-label={`${participant.name} bearbeiten`}
                                                title='Bearbeiten'
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                type='button'
                                                onClick={() => removeParticipant(participant.id)}
                                                className='button-icon button-danger'
                                                aria-label={`${participant.name} entfernen`}
                                                title='Entfernen'
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </form>

                {pairs.length > 0 && (
                    <>
                        <hr />

                        <h2>Ergebnisse & Kopiervorlagen</h2>

                        {/* Markdown / Discourse / Discord */}
                        <details open={pairs.length > 0}>
                            <summary>Discourse / Discord / Markdown</summary>
                            <blockquote>
                                <pre ref={discourseRef} className='output-pre'>
                                    {`🎮 **Spiele-Wichteln Paarungen**\n\n`}
                                    {pairs.map((pair, index) => (
                                        <React.Fragment key={index}>
                                            {`**${index + 1}. ${pair.sender.name}** bewichtelt **${pair.receiver.name}**\n`}
                                            {`   👤 Sender: [${pair.sender.name}](${pair.sender.link})`}
                                            {pair.sender.link2 ? ` | [Zweite Plattform](${pair.sender.link2})` : ''}
                                            {`\n   🎁 Empfänger: [${pair.receiver.name}](${pair.receiver.link})`}
                                            {pair.receiver.link2 ? ` | [Zweite Plattform](${pair.receiver.link2})` : ''}
                                            {pair.receiver.notes ? `\n   💡 Hinweis: _${pair.receiver.notes}_` : ''}
                                            {index < pairs.length - 1 ? '\n\n' : ''}
                                        </React.Fragment>
                                    ))}
                                </pre>
                                <button 
                                    onClick={() => copyToClipboard(discourseRef, 'Discourse/Discord/Markdown')}
                                    className='copy-button'
                                    aria-label='Discourse/Discord/Markdown Format kopieren'
                                >
                                    📋 In Zwischenablage kopieren
                                </button>
                            </blockquote>
                        </details>

                        {/* phpBB */}
                        <details>
                            <summary>phpBB</summary>
                            <blockquote>
                                <pre ref={phpRef} className='output-pre'>
                                    {`[b]🎮 Spiele-Wichteln Paarungen[/b]\n\n`}
                                    {pairs.map((pair, index) => (
                                        <React.Fragment key={index}>
                                            {`[b]${index + 1}. ${pair.sender.name}[/b] bewichtelt [b]${pair.receiver.name}[/b]\n`}
                                            {`   👤 Sender: [url=${pair.sender.link}]${pair.sender.name}[/url]`}
                                            {pair.sender.link2 ? ` | [url=${pair.sender.link2}]Zweite Plattform[/url]` : ''}
                                            {`\n   🎁 Empfänger: [url=${pair.receiver.link}]${pair.receiver.name}[/url]`}
                                            {pair.receiver.link2 ? ` | [url=${pair.receiver.link2}]Zweite Plattform[/url]` : ''}
                                            {pair.receiver.notes ? `\n   💡 Hinweis: [i]${pair.receiver.notes}[/i]` : ''}
                                            {index < pairs.length - 1 ? '\n\n' : ''}
                                        </React.Fragment>
                                    ))}
                                </pre>
                                <button 
                                    onClick={() => copyToClipboard(phpRef, 'phpBB')}
                                    className='copy-button'
                                    aria-label='phpBB Format kopieren'
                                >
                                    📋 In Zwischenablage kopieren
                                </button>
                            </blockquote>
                        </details>

                        {/* Plain Text / HTML */}
                        <details>
                            <summary>Text</summary>
                            <blockquote>
                                <div ref={textRef} className='output-text'>
                                    <h3 style={{marginTop: 0}}>🎮 Spiele-Wichteln Paarungen</h3>
                                    {pairs.map((pair, index) => (
                                        <div key={index} className='pair-item'>
                                            <div className='pair-header'>
                                                <strong>{index + 1}. {pair.sender.name}</strong> bewichtelt <strong>{pair.receiver.name}</strong>
                                            </div>
                                            <div className='pair-details'>
                                                <div className='pair-detail-row'>
                                                    <span className='pair-label'>👤 Sender:</span>
                                                    <a href={pair.sender.link} target='_blank' rel='noopener noreferrer'>{pair.sender.name}</a>
                                                    {pair.sender.link2 && (
                                                        <> | <a href={pair.sender.link2} target='_blank' rel='noopener noreferrer'>Zweite Plattform</a></>
                                                    )}
                                                </div>
                                                <div className='pair-detail-row'>
                                                    <span className='pair-label'>🎁 Empfänger:</span>
                                                    <a href={pair.receiver.link} target='_blank' rel='noopener noreferrer'>{pair.receiver.name}</a>
                                                    {pair.receiver.link2 && (
                                                        <> | <a href={pair.receiver.link2} target='_blank' rel='noopener noreferrer'>Zweite Plattform</a></>
                                                    )}
                                                </div>
                                                {pair.receiver.notes && (
                                                    <div className='pair-detail-row'>
                                                        <span className='pair-label'>💡 Hinweis:</span>
                                                        <em>{pair.receiver.notes}</em>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => copyToClipboard(textRef, 'Text')}
                                    className='copy-button'
                                    aria-label='Text Format kopieren'
                                >
                                    📋 In Zwischenablage kopieren
                                </button>
                            </blockquote>
                        </details>
                    </>
                )}
            </div>
        </Layout>
    );
}
