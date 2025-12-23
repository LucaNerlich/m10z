'use client';

import React, {useEffect, useState} from 'react';

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

function applyFont(fontId: string) {
    if (typeof document === 'undefined') return;
    const fontOption = FONT_OPTIONS.find((option) => option.id === fontId);
    if (fontOption) {
        document.documentElement.style.setProperty('--font-family', fontOption.cssVariable);
    }
}

export default function FontPicker(): React.ReactElement | null {
    const [selectedFont, setSelectedFont] = useState<string>(DEFAULT_FONT);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        let stored: string | null = null;
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                stored = window.localStorage.getItem(STORAGE_KEY);
            } catch (error) {
                // localStorage may be disabled or throw security exceptions
                console.warn('Failed to read font preference from localStorage:', error);
                stored = null;
            }
        }
        // Fallback to in-memory store if localStorage failed
        if (!stored && memoryStore.has(STORAGE_KEY)) {
            stored = memoryStore.get(STORAGE_KEY) || null;
        }
        const initial = stored && FONT_OPTIONS.some((option) => option.id === stored) ? stored : DEFAULT_FONT;
        setSelectedFont(initial);
        applyFont(initial);
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        // Always apply font regardless of storage success/failure
        applyFont(selectedFont);
        
        // Attempt to persist to localStorage with fallback to memory store
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                window.localStorage.setItem(STORAGE_KEY, selectedFont);
                // Clear memory store if localStorage succeeds
                memoryStore.delete(STORAGE_KEY);
            } catch (error) {
                // Handle quota exceeded or security exceptions
                const isQuotaError = error instanceof DOMException && 
                    (error.code === 22 || error.code === 1014 || error.name === 'QuotaExceededError');
                
                if (isQuotaError) {
                    console.warn('localStorage quota exceeded, using in-memory store for font preference');
                } else {
                    console.warn('Failed to save font preference to localStorage:', error);
                }
                
                // Fallback to in-memory store
                memoryStore.set(STORAGE_KEY, selectedFont);
            }
        } else {
            // No localStorage available, use memory store
            memoryStore.set(STORAGE_KEY, selectedFont);
        }
    }, [selectedFont, hydrated]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedFont(e.target.value);
    };

    if (!hydrated) {
        return null;
    }

    const selectedOption = FONT_OPTIONS.find((option) => option.id === selectedFont);
    const selectStyle = selectedOption
        ? {fontFamily: selectedOption.cssVariable}
        : undefined;

    return (
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
    );
}

