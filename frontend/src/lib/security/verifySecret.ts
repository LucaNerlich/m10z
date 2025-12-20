import crypto from 'node:crypto';

/**
 * Constant-time secret comparison to reduce timing attack surface.
 * Returns false if either value is missing.
 */
export function verifySecret(provided: string | null, expected: string | null): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}


