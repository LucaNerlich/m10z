const VALID_HOSTNAMES = [
    'steamcommunity.com',
    'www.steamcommunity.com',
    'steampowered.com',
    'www.steampowered.com',
    'store.steampowered.com',
    'gog.com',
    'www.gog.com',
];

export function validateName(name: string): string | null {
    const trimmed = name.trim();
    if (trimmed.length === 0) return 'Name darf nicht leer sein';
    if (trimmed.length < 2) return 'Name muss mindestens 2 Zeichen lang sein';
    if (trimmed.length > 100) return 'Name darf maximal 100 Zeichen lang sein';
    return null;
}

/**
 * Check whether a (trimmed, case-insensitive) name already exists among other
 * participants. Duplicate names make assignments ambiguous because the
 * assignment list shows names, not ids.
 */
/** Comparison key shared by the form check and the state check. */
function nameKey(name: string): string {
    return name.trim().normalize('NFC').toLowerCase();
}

export function validateUniqueName(existingNames: readonly string[], name: string): string | null {
    const key = nameKey(name);
    const isDuplicate = existingNames.some((existing) => nameKey(existing) === key);
    return isDuplicate ? 'Dieser Name ist bereits vergeben.' : null;
}

/**
 * Names that appear more than once (trimmed, case-insensitive), in first-seen order.
 * Used to reject hydrated state that predates `validateUniqueName`.
 */
export function findDuplicateNames(names: readonly string[]): string[] {
    const firstSeen = new Map<string, string>();
    const duplicates = new Map<string, string>();
    for (const name of names) {
        const trimmed = name.trim();
        const key = nameKey(trimmed);
        const first = firstSeen.get(key);
        if (first === undefined) {
            firstSeen.set(key, trimmed);
        } else {
            duplicates.set(key, first);
        }
    }
    return [...duplicates.values()];
}

export function validateProfileUrl(url: string): string | null {
    const trimmed = url.trim();
    if (trimmed.length === 0) return null;

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return 'Bitte gib eine gültige URL ein, die mit http:// oder https:// beginnt';
        }
        const isValid = VALID_HOSTNAMES.some((hostname) =>
            parsed.hostname === hostname ||
            parsed.hostname.endsWith(`.${hostname}`)
        );
        if (!isValid) {
            return 'Bitte gib eine gültige Steam- oder GOG-URL ein';
        }
        return null;
    } catch {
        return 'Bitte gib eine gültige URL ein (z.B. https://steamcommunity.com/id/... oder https://www.gog.com/u/...)';
    }
}
