/**
 * Refuse to replace a committed artifact with an empty generator result.
 *
 * An empty CMS page is indistinguishable from a filter or role change that hid
 * every record; writing the result would silently empty the production file and
 * the scheduled workflow would commit it as a normal refresh.
 */
export function requireNonEmpty(counts: Record<string, number>, artifact: string): void {
    if (Object.values(counts).every((count) => count === 0)) {
        throw new Error(
            `${artifact} generator returned no records (${Object.keys(counts).join(', ')}); refusing to overwrite the committed file.`
        );
    }
}
