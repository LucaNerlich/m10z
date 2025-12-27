'use client';

import {type KeyboardEvent, type MouseEvent, useEffect, useId, useMemo, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import Image from 'next/image';

import {searchIndex} from '@/src/lib/search/fuseClient';
import {type SearchRecord} from '@/src/lib/search/types';

import {Tag} from './Tag';
import styles from './SearchModal.module.css';

type SearchModalProps = {
    onClose: () => void;
};

type ResultItem = SearchRecord & {score?: number | null};

const TYPE_LABEL: Record<SearchRecord['type'], string> = {
    article: 'Artikel',
    podcast: 'Podcast',
    author: 'Autor-In',
    category: 'Kategorie',
};

function normalizeImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    // If URL already has a protocol, return as-is
    if (/^https?:\/\//i.test(url)) return url;

    // If URL starts with localhost or 127.0.0.1 without protocol, prepend http://
    // This handles cases like "localhost:1337/path" or "127.0.0.1:1337/path"
    if (/^localhost(?::\d+)?/i.test(url) || /^127\.0\.0\.1(?::\d+)?/i.test(url)) {
        return `http://${url}`;
    }

    return 'https://' + url;
}

/**
 * Modal dialog that lets the user search site content and pick a result using mouse or keyboard.
 *
 * Renders a search input, debounced results list with status messages, keyboard navigation (ArrowUp/Down, Enter, Escape),
 * and navigates to a selected result while closing the modal.
 *
 * @param onClose - Callback invoked to close the modal
 * @returns The React element for the search modal
 */
export function SearchModal({onClose}: SearchModalProps): React.ReactElement {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ResultItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const router = useRouter();
    const resultsId = useId();
    const shouldScrollRef = useRef(false);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const handleTabKey = (event: globalThis.KeyboardEvent) => {
            if (event.key !== 'Tab') return;

            const modalElement = document.querySelector(`.${styles.modal}`);
            if (!modalElement) return;

            // Only handle Tab if focus is within the modal
            if (!modalElement.contains(document.activeElement)) return;

            const isInput = document.activeElement === inputRef.current;
            const isResultButton = document.activeElement?.classList.contains(styles.result);

            // Only trap Tab when focus is on input or result buttons
            if (!isInput && !isResultButton) return;

            // Get all result buttons
            const resultButtons = Array.from(
                modalElement.querySelectorAll<HTMLElement>(`.${styles.result}`)
            );

            if (resultButtons.length === 0) return;

            event.preventDefault();

            if (isInput) {
                // Tab from input: go to first result
                if (event.shiftKey) {
                    // Shift+Tab from input: go to last result
                    resultButtons[resultButtons.length - 1]?.focus();
                } else {
                    // Tab from input: go to first result
                    resultButtons[0]?.focus();
                }
            } else if (isResultButton) {
                // Tab from result button
                const currentResultIndex = resultButtons.indexOf(document.activeElement as HTMLElement);
                if (currentResultIndex === -1) return;

                if (event.shiftKey) {
                    // Shift+Tab: backward
                    if (currentResultIndex === 0) {
                        // Cycle to input
                        inputRef.current?.focus();
                    } else {
                        // Move to previous result
                        resultButtons[currentResultIndex - 1]?.focus();
                    }
                } else {
                    // Tab: forward
                    if (currentResultIndex === resultButtons.length - 1) {
                        // Cycle to input
                        inputRef.current?.focus();
                    } else {
                        // Move to next result
                        resultButtons[currentResultIndex + 1]?.focus();
                    }
                }
            }
        };

        document.addEventListener('keydown', handleTabKey);
        return () => {
            document.removeEventListener('keydown', handleTabKey);
        };
    }, [results.length]);

    useEffect(() => {
        if (shouldScrollRef.current && activeIndex >= 0 && results.length > 0) {
            const activeElement = document.getElementById(`search-result-${activeIndex}`);
            if (activeElement) {
                activeElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
            }
        }
    }, [activeIndex, results.length]);

    useEffect(() => {
        let isCancelled = false;
        const trimmed = query.trim();

        if (trimmed.length === 0) {
            setResults([]);
            setLoading(false);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        const handle = setTimeout(() => {
            searchIndex(trimmed, 16)
                .then((matches) => {
                    if (isCancelled) return;
                    setResults(matches);
                    shouldScrollRef.current = false;
                    setActiveIndex(0);
                })
                .catch(() => {
                    if (isCancelled) return;
                    setError('Suche konnte nicht geladen werden.');
                })
                .finally(() => {
                    if (isCancelled) return;
                    setLoading(false);
                });
        }, 150);

        return () => {
            isCancelled = true;
            clearTimeout(handle);
        };
    }, [query]);

    const statusMessage = useMemo(() => {
        if (error) return error;
        if (loading) return 'Suchen ...';
        if (results.length === 0 && query.trim().length > 0) return 'Keine Treffer gefunden.';
        if (query.trim().length === 0) return 'Tippe, um nach Artikeln, Podcasts oder Autoren zu suchen.';
        return null;
    }, [error, loading, query, results.length]);

    const selectResult = (item: ResultItem) => {
        router.push(item.href);
        onClose();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            shouldScrollRef.current = true;
            setActiveIndex((prev) => Math.min(prev + 1, Math.max(results.length - 1, 0)));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            shouldScrollRef.current = true;
            setActiveIndex((prev) => Math.max(prev - 1, 0));
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const active = results[activeIndex] ?? results[0];
            if (active) selectResult(active);
        } else if (event.key === 'Escape') {
            onClose();
        }
    };

    const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    return (
        <div className={styles.backdrop} onClick={handleBackdropClick} role="presentation">
            <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Suche">
                <div className={styles.inputRow}>
                    <input
                        ref={inputRef}
                        className={styles.input}
                        type="search"
                        placeholder="Suche nach Artikeln, Podcasts, Kategorien oder Teammitgliedern"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        role="combobox"
                        aria-autocomplete="list"
                        aria-controls={resultsId}
                        aria-activedescendant={activeIndex >= 0 && results.length > 0 ? `search-result-${activeIndex}` : undefined}
                        aria-expanded={results.length > 0}
                    />
                    <button type="button" className={styles.closeButton} onClick={onClose}>
                        Esc
                    </button>
                </div>

                <div className={styles.results} id={resultsId} role="listbox" aria-label="Suchergebnisse">
                    {statusMessage ? <p className={styles.status} aria-live="polite">{statusMessage}</p> : null}

                    {results.map((item, idx) => (
                        <button
                            key={item.id}
                            id={`search-result-${idx}`}
                            type="button"
                            className={`${styles.result} ${idx === activeIndex ? styles.resultActive : ''}`}
                            onMouseEnter={() => {
                                shouldScrollRef.current = false;
                                setActiveIndex(idx);
                            }}
                            onClick={() => selectResult(item)}
                            role="option"
                            aria-selected={idx === activeIndex}
                        >
                            <div className={styles.resultContent}>
                                {item.coverImageUrl ? (() => {
                                    const normalizedUrl = normalizeImageUrl(item.coverImageUrl);
                                    return normalizedUrl ? (
                                        <div className={styles.resultImage}>
                                            <Image
                                                src={normalizedUrl}
                                                width={80}
                                                height={80}
                                                loading="lazy"
                                                quality={50}
                                                alt={item.title || ''}
                                                className={styles.coverImage}
                                            />
                                        </div>
                                    ) : null;
                                })() : null}
                                <div className={styles.resultText}>
                                    <div className={styles.resultHeader}>
                                        <Tag className={styles.typeBadge}>{TYPE_LABEL[item.type]}</Tag>
                                        <span className={styles.title}>{item.title}</span>
                                    </div>
                                    {item.description ? <p className={styles.description}>{item.description}</p> : null}
                                    {item.tags?.length ? (
                                        <div className={styles.tags}>
                                            {item.tags.filter(tag => TYPE_LABEL[item.type] !== tag)
                                                .map((tag) => (
                                                    <Tag key={tag} className={styles.tag}>
                                                        {tag}
                                                    </Tag>
                                                ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

