'use client';

import {useSyncExternalStore} from 'react';

const REGEX_APPLE_PLATFORM = /Mac|iPhone|iPad|iPod/;

const subscribeNoop = () => () => {};

const getIsMac = () => REGEX_APPLE_PLATFORM.test(navigator.platform);

// `false` on the server: the platform is unknowable there, and the value only
// affects the displayed shortcut label, which is corrected on hydration.
const getIsMacServer = () => false;

/**
 * Whether this client uses the Apple modifier (⌘) rather than Ctrl.
 *
 * `navigator.platform` is deprecated but is the only signal that distinguishes a
 * Mac from other desktops without parsing the user agent, and the consequence is
 * limited to a shortcut label.
 *
 * The match is a plain substring test (`/Mac|iPhone|iPad|iPod/`), so a platform
 * string merely *containing* one of those words counts as Apple - harmless for the
 * values browsers actually report, and only a label is affected.
 *
 * Shared by the header and the search launcher, which previously each declared
 * their own copy of the detection block.
 */
export function useIsMac(): boolean {
    return useSyncExternalStore(subscribeNoop, getIsMac, getIsMacServer);
}
