'use client';

import dynamic from 'next/dynamic';
import {type ContentWithTocProps} from './ContentWithToc';

const ContentWithToc = dynamic(() => import('./ContentWithToc').then((mod) => ({ default: mod.ContentWithToc })), {
    ssr: false,
});

export function ContentWithTocClient(props: ContentWithTocProps) {
    return <ContentWithToc {...props} />;
}
