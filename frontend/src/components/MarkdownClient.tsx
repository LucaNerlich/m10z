import {Markdown, type MarkdownProps} from '@/src/lib/markdown/Markdown';

/**
 * Backward-compatible wrapper that renders Markdown using the server-rendered Markdown component.
 *
 * @param props - Props forwarded to the underlying Markdown component.
 */
export function MarkdownClient(props: MarkdownProps) {
    return <Markdown {...props} />;
}
