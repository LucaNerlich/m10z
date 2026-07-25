'use client';

import {type ChangeEvent} from 'react';

import styles from './Input.module.css';

type InputProps = {
    type?: 'text' | 'url';
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    label: string;
    error?: string | null;
    id: string;
};

export function Input({
    type = 'text',
    value,
    onChange,
    placeholder,
    required = false,
    label,
    error,
    id,
}: InputProps) {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    return (
        <div className={styles.wrapper}>
            <label htmlFor={id} className={styles.label}>
                {label}
                {required && <span className={styles.required}>*</span>}
            </label>
            <input
                id={id}
                type={type}
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                required={required}
                className={`${styles.input} ${error ? styles.inputError : ''}`}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
            />
            {error && (
                <p id={`${id}-error`} className={styles.error} role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
