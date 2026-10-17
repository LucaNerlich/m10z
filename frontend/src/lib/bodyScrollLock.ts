/**
 * Ref-counted body scroll lock shared by overlays that can overlap (burger menu, search modal).
 *
 * Saving and restoring `body.style.overflow` per component leaks the lock when two overlays
 * overlap: the one that opens second snapshots `'hidden'` and writes it back after the first
 * released its own lock, leaving the page unscrollable. Counting holders keeps the body locked
 * exactly while at least one overlay is open and restores the pre-lock value once the last one
 * closes.
 *
 * Browser-only. Call from an effect and release via the returned cleanup.
 *
 * @returns An idempotent release function.
 */
let holders = 0;
let previousOverflow = '';

export function lockBodyScroll(): () => void {
    if (holders === 0) {
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
    }
    holders += 1;

    let released = false;
    return () => {
        if (released) return;
        released = true;
        holders -= 1;
        if (holders === 0) {
            document.body.style.overflow = previousOverflow;
        }
    };
}

/** Reset the module state (for tests). */
export function resetBodyScrollLockForTests(): void {
    holders = 0;
    previousOverflow = '';
}
