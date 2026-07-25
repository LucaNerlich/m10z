'use client';

import {useCallback, useEffect, useState, useSyncExternalStore} from 'react';

import {Button} from '@/src/components/Button/Button';
import {Input} from '@/src/components/Input/Input';
import {EmptyState} from '@/src/components/EmptyState';
import {getItem, setItem, removeItem} from '@/src/lib/storage/localStorage';
import {shuffleAndAssign} from '@/src/lib/wichteln/shuffle';
import {downloadMarkdown} from '@/src/lib/wichteln/export';
import {validateName, validateSteamUrl} from '@/src/lib/wichteln/validation';
import {type Participant, type Assignment} from './types';

import styles from './page.module.css';

const STORAGE_KEY = 'm10z-wichteln-state';

const subscribeNoop = () => () => {};
const getIsClient = () => true;
const getIsClientServer = () => false;

type FormErrors = {
    name?: string | null;
    steamUrl?: string | null;
};

export default function WichtelnPage() {
    const hydrated = useSyncExternalStore(subscribeNoop, getIsClient, getIsClientServer);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [isShuffling, setIsShuffling] = useState(false);
    const [newName, setNewName] = useState('');
    const [newSteamUrl, setNewSteamUrl] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!hydrated) return;
        try {
            const state = getItem<{
                participants: Participant[];
                assignments: Assignment[];
            }>(STORAGE_KEY);
            if (state) {
                if (Array.isArray(state.participants)) {
                    setParticipants(state.participants);
                }
                if (Array.isArray(state.assignments)) {
                    setAssignments(state.assignments);
                }
            }
        } catch {
            removeItem(STORAGE_KEY);
        }
    }, [hydrated]);

    const persist = useCallback(
        (
            newParticipants: Participant[],
            newAssignments: Assignment[]
        ) => {
            try {
                setItem(STORAGE_KEY, {
                    participants: newParticipants,
                    assignments: newAssignments,
                    timestamp: Date.now(),
                });
            } catch {
                setError('Fehler beim Speichern. Speicher könnte voll sein.');
            }
        },
        []
    );

    const clearError = useCallback(() => setError(null), []);

    const addParticipant = useCallback(() => {
        clearError();
        const nameError = validateName(newName);
        const steamError = validateSteamUrl(newSteamUrl);
        setFormErrors({name: nameError, steamUrl: steamError});
        if (nameError) return;

        const participant: Participant = {
            id: crypto.randomUUID(),
            name: newName.trim(),
            steamProfileUrl: newSteamUrl.trim(),
        };
        const updated = [...participants, participant];
        setParticipants(updated);
        setAssignments([]);
        persist(updated, []);
        setNewName('');
        setNewSteamUrl('');
        setEditingId(null);
    }, [newName, newSteamUrl, participants, persist, clearError]);

    const updateParticipant = useCallback(
        (id: string) => {
            clearError();
            const nameError = validateName(newName);
            const steamError = validateSteamUrl(newSteamUrl);
            setFormErrors({name: nameError, steamUrl: steamError});
            if (nameError) return;

            const updated = participants.map((p) =>
                p.id === id
                    ? {...p, name: newName.trim(), steamProfileUrl: newSteamUrl.trim()}
                    : p
            );
            setParticipants(updated);
            setAssignments([]);
            persist(updated, []);
            setNewName('');
            setNewSteamUrl('');
            setEditingId(null);
        },
        [newName, newSteamUrl, participants, persist, clearError]
    );

    const deleteParticipant = useCallback(
        (id: string) => {
            clearError();
            const updated = participants.filter((p) => p.id !== id);
            setParticipants(updated);
            setAssignments([]);
            persist(updated, []);
            if (editingId === id) {
                setEditingId(null);
                setNewName('');
                setNewSteamUrl('');
                setFormErrors({});
            }
        },
        [participants, persist, editingId, clearError]
    );

    const startEdit = useCallback(
        (participant: Participant) => {
            setEditingId(participant.id);
            setNewName(participant.name);
            setNewSteamUrl(participant.steamProfileUrl);
            setFormErrors({});
        },
        []
    );

    const cancelEdit = useCallback(() => {
        setEditingId(null);
        setNewName('');
        setNewSteamUrl('');
        setFormErrors({});
    }, []);

    const handleShuffle = useCallback(() => {
        clearError();
        if (participants.length < 2) {
            setError('Mindestens 2 Teilnehmer für die Zuordnung erforderlich.');
            return;
        }
        setIsShuffling(true);
        try {
            const result = shuffleAndAssign(participants);
            setAssignments(result);
            persist(participants, result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Zuordnung fehlgeschlagen.');
        } finally {
            setIsShuffling(false);
        }
    }, [participants, persist, clearError]);

    const handleExport = useCallback(() => {
        try {
            downloadMarkdown(participants, assignments);
        } catch {
            setError('Export fehlgeschlagen.');
        }
    }, [participants, assignments]);

    const handleResetAssignments = useCallback(() => {
        if (!confirm('Zuordnungen zurücksetzen?')) return;
        setAssignments([]);
        persist(participants, []);
    }, [participants, persist]);

    const handleClearAll = useCallback(() => {
        if (!confirm('Alle Daten löschen? Dies kann nicht rückgängig gemacht werden.'))
            return;
        setParticipants([]);
        setAssignments([]);
        setEditingId(null);
        setNewName('');
        setNewSteamUrl('');
        setFormErrors({});
        removeItem(STORAGE_KEY);
    }, []);

    if (!hydrated) return null;

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>Wichteln</h1>
                <p className={styles.subtitle}>
                    Organisiere deine Wichtelrunde — Teilnehmer verwalten,
                    zufällig zuordnen und Ergebnisse exportieren.
                </p>
            </header>

            {error && (
                <div className={styles.errorBanner} role="alert">
                    {error}
                    <button
                        type="button"
                        className={styles.errorClose}
                        onClick={clearError}
                        aria-label="Schließen"
                    >
                        ×
                    </button>
                </div>
            )}

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    {editingId ? 'Teilnehmer bearbeiten' : 'Teilnehmer hinzufügen'}
                </h2>
                <form
                    className={styles.form}
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (editingId) {
                            updateParticipant(editingId);
                        } else {
                            addParticipant();
                        }
                    }}
                >
                    <Input
                        id="wichteln-name"
                        label="Name"
                        value={newName}
                        onChange={(v) => {
                            setNewName(v);
                            setFormErrors((prev) => ({
                                ...prev,
                                name: validateName(v),
                            }));
                        }}
                        placeholder="z.B. Max Mustermann"
                        required
                        error={formErrors.name}
                    />
                    <Input
                        id="wichteln-steam-url"
                        label="Steam-Profil-URL"
                        type="url"
                        value={newSteamUrl}
                        onChange={(v) => {
                            setNewSteamUrl(v);
                            setFormErrors((prev) => ({
                                ...prev,
                                steamUrl: validateSteamUrl(v),
                            }));
                        }}
                        placeholder="https://steamcommunity.com/id/..."
                        error={formErrors.steamUrl}
                    />
                    <div className={styles.formActions}>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={!!formErrors.name}
                        >
                            {editingId ? 'Speichern' : 'Hinzufügen'}
                        </Button>
                        {editingId && (
                            <Button
                                variant="secondary"
                                onClick={cancelEdit}
                                type="button"
                            >
                                Abbrechen
                            </Button>
                        )}
                    </div>
                </form>
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                    Teilnehmer ({participants.length})
                </h2>
                {participants.length === 0 ? (
                    <EmptyState message="Füge den ersten Teilnehmer hinzu, um zu starten." />
                ) : (
                    <ul className={styles.participantList}>
                        {participants.map((p) => (
                            <li key={p.id} className={styles.participantItem}>
                                <div className={styles.participantInfo}>
                                    <span className={styles.participantName}>
                                        {p.name}
                                    </span>
                                    {p.steamProfileUrl && (
                                        <a
                                            href={p.steamProfileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.participantSteam}
                                        >
                                            Steam-Profil
                                        </a>
                                    )}
                                </div>
                                <div className={styles.participantActions}>
                                    <button
                                        type="button"
                                        className={styles.actionButton}
                                        onClick={() => startEdit(p)}
                                        aria-label={`${p.name} bearbeiten`}
                                    >
                                        Bearbeiten
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.actionButtonDanger}
                                        onClick={() => deleteParticipant(p.id)}
                                        aria-label={`${p.name} löschen`}
                                    >
                                        Löschen
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Aktionen</h2>
                <div className={styles.actionGroup}>
                    <Button
                        variant="primary"
                        onClick={handleShuffle}
                        disabled={participants.length < 2}
                        loading={isShuffling}
                    >
                        Shuffle &amp; Zuordnen
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleExport}
                        disabled={assignments.length === 0}
                    >
                        Als Markdown exportieren
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleResetAssignments}
                        disabled={assignments.length === 0}
                    >
                        Zuordnungen zurücksetzen
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleClearAll}
                        disabled={participants.length === 0 && assignments.length === 0}
                    >
                        Alle Daten löschen
                    </Button>
                </div>
                {participants.length < 2 && (
                    <p className={styles.hint}>
                        Mindestens 2 Teilnehmer für die Zuordnung erforderlich.
                    </p>
                )}
            </section>

            {assignments.length > 0 && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Zuordnungen</h2>
                    <ul className={styles.assignmentList}>
                        {assignments.map((a) => {
                            const giver = participants.find(
                                (p) => p.id === a.giverId
                            );
                            const receiver = participants.find(
                                (p) => p.id === a.receiverId
                            );
                            if (!giver || !receiver) return null;
                            return (
                                <li key={a.giverId} className={styles.assignmentItem}>
                                    <span className={styles.assignmentGiver}>
                                        {giver.name}
                                    </span>
                                    <span className={styles.assignmentArrow}>→</span>
                                    <span className={styles.assignmentReceiver}>
                                        {receiver.name}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}
        </div>
    );
}
