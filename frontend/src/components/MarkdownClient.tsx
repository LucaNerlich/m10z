import {Markdown, type MarkdownProps} from '@/src/lib/markdown/Markdown';

/**
 * Server-rendered Markdown wrapper (kept for backwards compatibility with prior imports).
 */
export function MarkdownClient(props: MarkdownProps) {
    return <Markdown {...props} />;
}

