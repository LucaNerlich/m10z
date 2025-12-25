'use client';

import {useRef} from 'react';
import {Markdown} from '@/src/lib/markdown/Markdown';
import {TableOfContents} from '@/src/components/TableOfContents';
import {ContentLayout} from '@/app/ContentLayout';

type ContentWithTocProps = {
    markdown: string;
    contentClassName?: string;
};

/**
 * Client component that wraps markdown content with Table of Contents.
 * Manages the content ref internally and conditionally renders ToC.
 * Used for both articles and podcast shownotes.
 */
export function ContentWithToc({markdown, contentClassName}: ContentWithTocProps) {
    const contentRef = useRef<HTMLDivElement>(null);

    return (
        <ContentLayout sidebar={<TableOfContents contentRef={contentRef as React.RefObject<HTMLElement | null>} />}>
            <div ref={contentRef} className={contentClassName}>
                <Markdown markdown={markdown} />
            </div>
        </ContentLayout>
    );
}

