/**
 * True when a keyboard event's target is a text field, so a global shortcut must
 * not hijack the keystroke (the open search input included).
 */
export function isEditableTarget(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || Boolean(target.isContentEditable))
    );
}
