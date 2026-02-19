import {type HeadingItem} from '@/src/lib/markdown/extractHeadings';

import {TableOfContentsClient} from './TableOfContentsClient';

type TableOfContentsProps = {
    headings: HeadingItem[];
};

/** Minimum number of headings required to show the TOC. */
const MIN_HEADINGS = 4;

/**
 * Server Component wrapper for the article table of contents.
 *
 * Returns null when the article has too few headings to justify a TOC.
 * Otherwise renders the client-side interactive TOC.
 */
export function TableOfContents({headings}: TableOfContentsProps) {
    if (headings.length < MIN_HEADINGS) return null;

    return <TableOfContentsClient headings={headings} />;
}
