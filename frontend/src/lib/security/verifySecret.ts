import crypto from 'node:crypto';

/**
 * Constant-time secret comparison to reduce timing attack surface.
 * Returns false if either value is missing.
 */
export function verifySecret(provided: string | null, expected: string | null): boolean {
    if (!provided || !expected) return false;
    // Pad both buffers to equal length before comparison. timingSafeEqual requires
    // same-length inputs, and we must not leak the expected token's length via an
    // early-return on length mismatch. The separate lengthMatch check ensures that
    // two strings of different length never compare as equal, even if the shorter
    // one is a prefix of the longer one (since padding is zero-filled).
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    const maxLen = Math.max(a.length, b.length);
    const paddedA = Buffer.alloc(maxLen);
    const paddedB = Buffer.alloc(maxLen);
    a.copy(paddedA);
    b.copy(paddedB);
    const lengthMatch = a.length === b.length;
    const contentMatch = crypto.timingSafeEqual(paddedA, paddedB);
    return lengthMatch && contentMatch;
}


