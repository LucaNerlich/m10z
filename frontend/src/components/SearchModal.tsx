'use client';

import {type KeyboardEvent, type MouseEvent, useEffect, useMemo, useRef, useState} from 'react';
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

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

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
            setActiveIndex((prev) => Math.min(prev + 1, Math.max(results.length - 1, 0)));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
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
                    />
                    <button type="button" className={styles.closeButton} onClick={onClose}>
                        Esc
                    </button>
                </div>

                <div className={styles.results} role="listbox" aria-label="Suchergebnisse">
                    {statusMessage ? <p className={styles.status}>{statusMessage}</p> : null}

                    {results.map((item, idx) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`${styles.result} ${idx === activeIndex ? styles.resultActive : ''}`}
                            onMouseEnter={() => setActiveIndex(idx)}
                            onClick={() => selectResult(item)}
                            role="option"
                            aria-selected={idx === activeIndex}
                        >
                            <div className={styles.resultContent}>
                                {item.coverImageUrl ? (() => {
                                    console.log('item', item);
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

