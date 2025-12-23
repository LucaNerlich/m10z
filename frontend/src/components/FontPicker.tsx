'use client';

import React, {useEffect, useState} from 'react';

import styles from './FontPicker.module.css';

const STORAGE_KEY = 'm10z-font-family';

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
        const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
        const initial = stored && FONT_OPTIONS.some((option) => option.id === stored) ? stored : DEFAULT_FONT;
        setSelectedFont(initial);
        applyFont(initial);
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        applyFont(selectedFont);
        window.localStorage.setItem(STORAGE_KEY, selectedFont);
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

