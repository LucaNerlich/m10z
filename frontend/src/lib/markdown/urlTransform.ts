import {defaultUrlTransform} from 'react-markdown';

/**
 * `react-markdown`'s URL transform, plus the phone scheme.
 *
 * The default drops every scheme outside http(s)/irc(s)/mailto/xmpp before the
 * sanitizer runs, which makes `tel:` links inert. `Anchor` keeps them in the
 * same tab and never counts them as outbound.
 */
export function markdownUrlTransform(url: string): string {
    return /^tel:/i.test(url) ? url : defaultUrlTransform(url);
}
