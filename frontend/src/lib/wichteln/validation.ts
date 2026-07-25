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

export function isValidHttpUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}
