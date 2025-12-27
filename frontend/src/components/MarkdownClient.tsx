'use client';

import dynamic from 'next/dynamic';
import {type MarkdownProps} from '@/src/lib/markdown/Markdown';

const Markdown = dynamic(() => import('@/src/lib/markdown/Markdown').then((mod) => ({default: mod.Markdown})), {
    ssr: false,
});

export function MarkdownClient(props: MarkdownProps) {
    return <Markdown {...props} />;
}

