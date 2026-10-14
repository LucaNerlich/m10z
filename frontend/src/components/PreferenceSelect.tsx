'use client';

import React from 'react';

export type PreferenceOption = {
    id: string;
    displayName: string;
};

export type PreferenceSelectProps = {
    options: readonly PreferenceOption[];
    value: string;
    onChange: (value: string) => void;
    ariaLabel: string;
    /** Class for the wrapper, from the caller's CSS module. */
    wrapperClassName: string;
    /** Class for the `<select>`, from the caller's CSS module. */
    selectClassName: string;
    selectStyle?: React.CSSProperties;
};

/**
 * The footer preference dropdown shared by the theme and font pickers.
 *
 * Styling stays with the caller (both pass their own CSS-module classes): the
 * two pickers intentionally differ in the select's corner radius.
 */
export function PreferenceSelect({
    options,
    value,
    onChange,
    ariaLabel,
    wrapperClassName,
    selectClassName,
    selectStyle,
}: PreferenceSelectProps): React.ReactElement {
    return (
        <div className={wrapperClassName}>
            <select
                className={selectClassName}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                aria-label={ariaLabel}
                style={selectStyle}
            >
                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.displayName}
                    </option>
                ))}
            </select>
        </div>
    );
}
