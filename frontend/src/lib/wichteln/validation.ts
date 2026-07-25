const STEAM_VALID_HOSTNAMES = [
    'steamcommunity.com',
    'www.steamcommunity.com',
    'steampowered.com',
    'www.steampowered.com',
    'store.steampowered.com',
];

export function validateName(name: string): string | null {
    const trimmed = name.trim();
    if (trimmed.length === 0) return 'Name darf nicht leer sein';
    if (trimmed.length < 2) return 'Name muss mindestens 2 Zeichen lang sein';
    if (trimmed.length > 100) return 'Name darf maximal 100 Zeichen lang sein';
    return null;
}

export function validateSteamUrl(url: string): string | null {
    const trimmed = url.trim();
    if (trimmed.length === 0) return null;

    try {
        const parsed = new URL(trimmed);
        const isValid = STEAM_VALID_HOSTNAMES.some((hostname) =>
            parsed.hostname === hostname ||
            parsed.hostname.endsWith(`.${hostname}`)
        );
        if (!isValid) {
            return 'Bitte gib eine gültige Steam-URL ein';
        }
        return null;
    } catch {
        return 'Bitte gib eine gültige URL ein (z.B. https://steamcommunity.com/id/...)';
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
