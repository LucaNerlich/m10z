'use client';

import {useEffect, useRef, useState} from 'react';
import {Markdown} from '@/src/lib/markdown/Markdown';
import {TableOfContents} from '@/src/components/TableOfContents';
import {ContentLayout} from '@/app/ContentLayout';

export type ContentWithTocProps = {
    markdown: string;
    contentClassName?: string;
};

/**
 * Client component that wraps markdown content with Table of Contents.
 * Manages the content ref internally and conditionally renders ToC.
 * Used for both articles and podcast shownotes.
 * TOC is not rendered on mobile devices (≤640px) to avoid infinite loops.
 */
export function ContentWithToc({markdown, contentClassName}: ContentWithTocProps) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [showToc, setShowToc] = useState(false); // Start with false to avoid hydration mismatch

    useEffect(() => {
        // Only check after mount to avoid hydration issues
        const checkScreenSize = () => {
            setShowToc(window.innerWidth > 640);
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    return (
        <ContentLayout
            sidebar={
                showToc ? <TableOfContents contentRef={contentRef as React.RefObject<HTMLElement | null>} /> : undefined
            }
        >
            <div ref={contentRef} className={contentClassName}>
                <Markdown markdown={markdown} />
            </div>
        </ContentLayout>
    );
}

