'use client';

import {type KeyboardEvent, type MouseEvent, useEffect, useId, useMemo, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import Image from 'next/image';
import {BookIcon, MusicNoteIcon, UserIcon} from '@phosphor-icons/react/dist/ssr';

import {useSearchQuery} from '@/src/hooks/useSearchQuery';
import {type SearchRecord} from '@/src/lib/search/types';
import {umamiEventId} from '@/src/lib/analytics/umami';

import {Tag} from './Tag';
import styles from './SearchModal.module.css';

type SearchModalProps = {
    onClose: () => void;
};

type ResultItem = SearchRecord & {score?: number | null};

const TYPE_LABEL: Record<SearchRecord['type'], string> = {
    article: 'Artikel',
    podcast: 'Podcast',
    author: 'AutorIn',
    category: 'Kategorie',
};

const TYPE_ICON: Record<SearchRecord['type'], typeof BookIcon> = {
    article: BookIcon,
    podcast: MusicNoteIcon,
    author: UserIcon,
    category: BookIcon,
};

// Hoist RegExp patterns to module scope
const REGEX_HTTP_PROTOCOL = /^https?:\/\//i;
const REGEX_LOCALHOST = /^localhost(?::\d+)?/i;
const REGEX_127_0_0_1 = /^127\.0\.0\.1(?::\d+)?/i;

function normalizeImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    // If URL already has a protocol, return as-is
    if (REGEX_HTTP_PROTOCOL.test(url)) return url;

    // If URL starts with localhost or 127.0.0.1 without protocol, prepend http://
    // This handles cases like "localhost:1337/path" or "127.0.0.1:1337/path"
    if (REGEX_LOCALHOST.test(url) || REGEX_127_0_0_1.test(url)) {
        return `http://${url}`;
    }

    return 'https://' + url;
}

/**
 * Display a modal that lets the user search site content and choose a result.
 *
 * Provides a search input with debounced results, keyboard navigation (ArrowUp/Down, Enter, Escape),
 * Tab/Shift+Tab focus trapping between the input and results, status messages, and navigation to a selected result while closing the modal.
 *
 * @param onClose - Callback invoked to close the modal
 * @returns The React element for the search modal
 */
export function SearchModal({onClose}: SearchModalProps): React.ReactElement {
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const modalRef = useRef<HTMLDivElement | null>(null);
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);
    const router = useRouter();
    const resultsId = useId();
    const shouldScrollRef = useRef(false);

    // Use SWR hook for search queries with automatic debouncing and caching
    const {results, isLoading, error: searchError} = useSearchQuery(query, 150);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const handleTabKey = (event: globalThis.KeyboardEvent) => {
            if (event.key !== 'Tab') return;

            if (!modalRef.current) return;

            // Only handle Tab if focus is within the modal
            if (!modalRef.current.contains(document.activeElement)) return;

            // Get all tabbable elements: input, close button, and result buttons
            const tabbableElements = Array.from(
                modalRef.current.querySelectorAll<HTMLElement>(
                    'input, button:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ),
            ).filter((el) => !el.hasAttribute('disabled'));

            if (tabbableElements.length === 0) return;

            const isInput = document.activeElement === inputRef.current;
            const isCloseButton = document.activeElement === closeButtonRef.current;
            const isResultButton = tabbableElements.includes(document.activeElement as HTMLElement) && !isInput && !isCloseButton;

            // Only trap Tab when focus is on input, close button, or result buttons
            if (!isInput && !isCloseButton && !isResultButton) return;

            // Get result buttons (exclude input and close button)
            const resultButtons = tabbableElements.filter(
                (el) => el !== inputRef.current && el !== closeButtonRef.current,
            );

            event.preventDefault();

            const currentIndex = tabbableElements.indexOf(document.activeElement as HTMLElement);
            if (currentIndex === -1) return;

            if (event.shiftKey) {
                // Shift+Tab: backward
                if (currentIndex === 0) {
                    // Cycle to last element
                    tabbableElements[tabbableElements.length - 1]?.focus();
                } else {
                    // Move to previous element
                    tabbableElements[currentIndex - 1]?.focus();
                }
            } else {
                // Tab: forward
                if (currentIndex === tabbableElements.length - 1) {
                    // Cycle to first element
                    tabbableElements[0]?.focus();
                } else {
                    // Move to next element
                    tabbableElements[currentIndex + 1]?.focus();
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

    // Reset active index when results change (derived state during render)
    const [prevResultsLength, setPrevResultsLength] = useState(results.length);
    if (results.length !== prevResultsLength) {
        setPrevResultsLength(results.length);
        if (results.length > 0) {
            setActiveIndex(0);
        }
    }

    useEffect(() => {
        shouldScrollRef.current = false;
    }, [results.length]);

    const statusMessage = useMemo(() => {
        if (searchError) return 'Suche konnte nicht geladen werden.';
        if (isLoading) return 'Suchen ...';
        if (results.length === 0 && query.trim().length > 0) return 'Keine Treffer gefunden.';
        if (query.trim().length === 0) return 'Tippe, um nach Artikeln, Podcasts oder Autoren zu suchen.';
        return null;
    }, [searchError, isLoading, query, results.length]);

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
            <div ref={modalRef} className={styles.modal} role="dialog" aria-modal="true" aria-label="Suche">
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
                    <button
                        ref={closeButtonRef}
                        type="button"
                        className={styles.closeButton}
                        onClick={onClose}
                        data-umami-event="search-close"
                    >
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
                            data-umami-event={umamiEventId(['search', 'select', item.type])}
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
                                        {(() => {
                                            const IconComponent = TYPE_ICON[item.type];
                                            return (
                                                <Tag className={styles.typeBadge} icon={<IconComponent size={14} />}>
                                                    {TYPE_LABEL[item.type]}
                                                </Tag>
                                            );
                                        })()}
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
