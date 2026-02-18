'use client';

import React, {useEffect, useState, useSyncExternalStore} from 'react';

import styles from './FontPicker.module.css';

const STORAGE_KEY = 'm10z-font-family';

// In-memory fallback store for when localStorage is unavailable
const memoryStore = new Map<string, string>();

interface FontOption {
    id: string;
    displayName: string;
    cssVariable: string;
}

const FONT_OPTIONS: FontOption[] = [
    {id: 'argon', displayName: 'Argon', cssVariable: 'var(--font-argon-family)'},
    {id: 'krypton', displayName: 'Krypton', cssVariable: 'var(--font-krypton-family)'},
    {id: 'neon', displayName: 'Neon', cssVariable: 'var(--font-neon-family)'},
    {id: 'poppins', displayName: 'Poppins', cssVariable: 'var(--font-poppins-family)'},
    {id: 'radon', displayName: 'Radon', cssVariable: 'var(--font-radon-family)'},
    {id: 'xenon', displayName: 'Xenon', cssVariable: 'var(--font-xenon-family)'},
];

const DEFAULT_FONT = 'poppins';

const subscribeNoop = () => () => {};
const getIsClient = () => true;
const getIsClientServer = () => false;

function getStoredFont(): string {
    if (typeof window === 'undefined') return DEFAULT_FONT;

    let stored: string | null = null;
    if (window.localStorage) {
        try {
            stored = window.localStorage.getItem(STORAGE_KEY);
        } catch (error) {
            console.warn('Failed to read font preference from localStorage:', error);
            stored = null;
        }
    }
    if (!stored && memoryStore.has(STORAGE_KEY)) {
        stored = memoryStore.get(STORAGE_KEY) || null;
    }
    return stored && FONT_OPTIONS.some((option) => option.id === stored) ? stored : DEFAULT_FONT;
}

function applyFont(fontId: string) {
    if (typeof document === 'undefined') return;
    const fontOption = FONT_OPTIONS.find((option) => option.id === fontId);
    if (fontOption) {
        document.documentElement.style.setProperty('--font-family', fontOption.cssVariable);
    }
}

function persistFont(fontId: string) {
    let storageSucceeded = false;
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            window.localStorage.setItem(STORAGE_KEY, fontId);
            storageSucceeded = true;
            memoryStore.delete(STORAGE_KEY);
        } catch (error) {
            const isQuotaError = error instanceof DOMException && error.name === 'QuotaExceededError';
            if (isQuotaError) {
                console.warn('localStorage quota exceeded, using in-memory store for font preference');
            } else {
                console.warn('Failed to save font preference to localStorage:', error);
            }
        }
    }
    if (!storageSucceeded) {
        memoryStore.set(STORAGE_KEY, fontId);
    }
}

export default function FontPicker(): React.ReactElement | null {
    const storedFont = useSyncExternalStore(subscribeNoop, getStoredFont, () => DEFAULT_FONT);
    const [userFont, setUserFont] = useState<string | null>(null);
    const selectedFont = userFont ?? storedFont;
    const hydrated = useSyncExternalStore(subscribeNoop, getIsClient, getIsClientServer);

    useEffect(() => {
        applyFont(selectedFont);
    }, [selectedFont]);

    useEffect(() => {
        if (userFont === null) return;
        persistFont(userFont);
    }, [userFont]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setUserFont(e.target.value);
    };

    if (!hydrated) {
        return null;
    }

    const selectedOption = FONT_OPTIONS.find((option) => option.id === selectedFont);
    const selectStyle = selectedOption
        ? {fontFamily: selectedOption.cssVariable}
        : undefined;

    return (
        <div className={styles.pickerWrapper}>
            <select
                className={styles.picker}
                value={selectedFont}
                onChange={handleChange}
                aria-label="Schriftart auswählen"
                style={selectStyle}
            >
                {FONT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.displayName}
                    </option>
                ))}
            </select>
        </div>
    );
}

