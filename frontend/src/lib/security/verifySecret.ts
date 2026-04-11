import crypto from 'node:crypto';

/**
 * Constant-time secret comparison to reduce timing attack surface.
 * Returns false if either value is missing.
 */
export function verifySecret(provided: string | null, expected: string | null): boolean {
    if (!provided || !expected) return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    const maxLen = Math.max(a.length, b.length);
    const paddedA = Buffer.alloc(maxLen);
    const paddedB = Buffer.alloc(maxLen);
    a.copy(paddedA);
    b.copy(paddedB);
    // Avoid short-circuit: always run timingSafeEqual regardless of length match
    const lengthMatch = a.length === b.length;
    const contentMatch = crypto.timingSafeEqual(paddedA, paddedB);
    return lengthMatch && contentMatch;
}


