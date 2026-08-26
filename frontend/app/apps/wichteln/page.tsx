'use client';

import {useCallback, useEffect, useState, useSyncExternalStore} from 'react';

import {Button} from '@/src/components/Button/Button';
import {Input} from '@/src/components/Input/Input';
import {EmptyState} from '@/src/components/EmptyState';
import {getItem, setItem, removeItem} from '@/src/lib/storage/localStorage';
import {shuffleAndAssign} from '@/src/lib/wichteln/shuffle';
import {downloadMarkdown, downloadMarkdownForGiver} from '@/src/lib/wichteln/export';
import {validateName, validateProfileUrl, validateUniqueName} from '@/src/lib/wichteln/validation';
import {type Participant, type Assignment} from './types';

import styles from './page.module.css';

const STORAGE_KEY = 'm10z-wichteln-state';

const subscribeNoop = () => () => {};
const getIsClient = () => true;
const getIsClientServer = () => false;

type FormErrors = {
    name?: string | null;
    profileUrl?: string | null;
};

function migrateParticipant(p: Record<string, unknown>): Participant {
    return {
        id: String(p.id ?? crypto.randomUUID()),
        name: String(p.name ?? ''),
        profileUrl: String(p.profileUrl ?? p.steamProfileUrl ?? ''),
    };
}

export default function WichtelnPage() {
    const hydrated = useSyncExternalStore(subscribeNoop, getIsClient, getIsClientServer);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [isShuffling, setIsShuffling] = useState(false);
    const [newName, setNewName] = useState('');
    const [newProfileUrl, setNewProfileUrl] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!hydrated) return;
        try {
            const raw = getItem<{
                participants?: Record<string, unknown>[];
                assignments?: Assignment[];
            }>(STORAGE_KEY);
            if (raw) {
                if (Array.isArray(raw.participants)) {
                    setParticipants(raw.participants.map(migrateParticipant));
                }
                if (Array.isArray(raw.assignments)) {
                    setAssignments(raw.assignments);
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
            setItem(STORAGE_KEY, {
                participants: newParticipants,
                assignments: newAssignments,
                timestamp: Date.now(),
            });
        },
        []
    );

    const clearError = useCallback(() => setError(null), []);

    const addParticipant = useCallback(() => {
        clearError();
        const nameError = validateName(newName) ?? validateUniqueName(participants.map((p) => p.name), newName);
        const profileError = validateProfileUrl(newProfileUrl);
        setFormErrors({name: nameError, profileUrl: profileError});
        if (nameError || profileError) return;

        const participant: Participant = {
            id: crypto.randomUUID(),
            name: newName.trim(),
            profileUrl: newProfileUrl.trim(),
        };
        const updated = [...participants, participant];
        setParticipants(updated);
        setAssignments([]);
        persist(updated, []);
        setNewName('');
        setNewProfileUrl('');
        setEditingId(null);
    }, [newName, newProfileUrl, participants, persist, clearError]);

    const updateParticipant = useCallback(
        (id: string) => {
            clearError();
            const nameError =
                validateName(newName) ??
                validateUniqueName(
                    participants.filter((p) => p.id !== id).map((p) => p.name),
                    newName,
                );
            const profileError = validateProfileUrl(newProfileUrl);
            setFormErrors({name: nameError, profileUrl: profileError});
            if (nameError || profileError) return;

            const updated = participants.map((p) =>
                p.id === id
                    ? {...p, name: newName.trim(), profileUrl: newProfileUrl.trim()}
                    : p
            );
            setParticipants(updated);
            persist(updated, assignments);
            setNewName('');
            setNewProfileUrl('');
            setEditingId(null);
        },
        [newName, newProfileUrl, participants, assignments, persist, clearError]
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
                setNewProfileUrl('');
                setFormErrors({});
            }
        },
        [participants, persist, editingId, clearError]
    );

    const startEdit = useCallback(
        (participant: Participant) => {
            setEditingId(participant.id);
            setNewName(participant.name);
            setNewProfileUrl(participant.profileUrl);
            setFormErrors({});
        },
        []
    );

    const cancelEdit = useCallback(() => {
        setEditingId(null);
        setNewName('');
        setNewProfileUrl('');
        setFormErrors({});
    }, []);

    const handleShuffle = useCallback(() => {
        clearError();
        if (participants.length < 2) {
            setError('Mindestens 2 Teilnehmer für die Zuordnung erforderlich.');
            return;
        }
        setIsShuffling(true);
        const result = shuffleAndAssign(participants);
        setAssignments(result);
        persist(participants, result);
        setIsShuffling(false);
    }, [participants, persist, clearError]);

    const handleExport = useCallback(() => {
        downloadMarkdown(participants, assignments);
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
        setNewProfileUrl('');
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
                        id="wichteln-profile-url"
                        label="Profil-URL (Steam / GOG)"
                        type="url"
                        value={newProfileUrl}
                        onChange={(v) => {
                            setNewProfileUrl(v);
                            setFormErrors((prev) => ({
                                ...prev,
                                profileUrl: validateProfileUrl(v),
                            }));
                        }}
                        placeholder="https://steamcommunity.com/id/... oder https://www.gog.com/u/..."
                        error={formErrors.profileUrl}
                    />
                    <div className={styles.formActions}>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={!!formErrors.name || !!formErrors.profileUrl}
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
                                    {p.profileUrl && (
                                        <a
                                            href={p.profileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.participantSteam}
                                        >
                                            Profil
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
                    <p className={styles.hint}>
                        Diese Liste ist nur für die Organisation gedacht. Lade für jeden
                        Teilnehmer eine eigene Datei herunter, um die Zuordnung geheim zu halten.
                    </p>
                    <ul className={styles.assignmentList}>
                        {(() => {
                            const participantMap = new Map(participants.map((p) => [p.id, p]));
                            return assignments.map((a) => {
                                const giver = participantMap.get(a.giverId);
                                const receiver = participantMap.get(a.receiverId);
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
                                        <button
                                            type="button"
                                            className={styles.actionButton}
                                            onClick={() =>
                                                downloadMarkdownForGiver(participants, assignments, a.giverId)
                                            }
                                            aria-label={`Eigene Datei für ${giver.name} herunterladen`}
                                        >
                                            Eigene Datei
                                        </button>
                                    </li>
                                );
                            });
                        })()}
                    </ul>
                </section>
            )}
        </div>
    );
}
