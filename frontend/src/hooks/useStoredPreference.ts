'use client';

import {useEffect, useState, useSyncExternalStore} from 'react';

// getIsClient / getIsClientServer discriminate SSR from client for hydration
// safety: the stored value is only read once the client snapshot is in play.
const getIsClient = () => true;
const getIsClientServer = () => false;
const subscribeNoop = () => () => {};

export type StoredPreference<T extends string> = {
    /** The effective value: the user's in-session override, else the stored one. */
    value: T;
    /** Override the stored value; the override is persisted by an effect. */
    setValue: (value: T) => void;
    /** True once the client has hydrated — render nothing before that. */
    hydrated: boolean;
};

export type StoredPreferenceOptions<T extends string> = {
    /** Subscribe to external changes (cross-tab, same-tab writers). Defaults to no subscription. */
    subscribe?: (onChange: () => void) => () => void;
    /** Read the persisted value on the client. */
    getStored: () => T;
    /** Snapshot used during SSR / before hydration. */
    getServerValue: () => T;
    /** Apply the value to the document. Must be a stable reference. */
    apply: (value: T) => void;
    /** Persist a user override. Must be a stable reference. */
    persist: (value: T) => void;
};

/**
 * Shared plumbing for the footer pickers (theme, font): external-store
 * subscription, an in-session override, the hydration gate, and the
 * apply/persist effects.
 *
 * `apply` and `persist` are used as effect dependencies, so pass stable
 * (module-level) functions — an inline arrow would re-run the effect on every
 * render.
 */
export function useStoredPreference<T extends string>({
    subscribe = subscribeNoop,
    getStored,
    getServerValue,
    apply,
    persist,
}: StoredPreferenceOptions<T>): StoredPreference<T> {
    const stored = useSyncExternalStore(subscribe, getStored, getServerValue);
    const [userValue, setUserValue] = useState<T | null>(null);
    const value = userValue ?? stored;
    const hydrated = useSyncExternalStore(subscribeNoop, getIsClient, getIsClientServer);

    useEffect(() => {
        apply(value);
    }, [value, apply]);

    useEffect(() => {
        if (userValue === null) return;
        persist(userValue);
    }, [userValue, persist]);

    return {value, setValue: setUserValue, hydrated};
}
