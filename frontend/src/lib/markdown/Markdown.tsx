import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkSmartypants from 'remark-smartypants';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeSlug from 'rehype-slug';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeUnwrapImages from 'rehype-unwrap-images';

import {Anchor} from '@/src/components/markdown/Anchor';
import {Code} from '@/src/components/markdown/Code';
import {FancyboxClient} from '@/src/components/markdown/FancyboxClient';
import {Heading} from '@/src/components/markdown/Heading';
import {Image} from '@/src/components/markdown/Image';

import {preprocessMarkdown} from './preprocess';
import {REHYPE_EXTERNAL_LINKS_OPTIONS, REHYPE_SANITIZE_SCHEMA, REMARK_REHYPE_OPTIONS} from './plugins';

export type MarkdownProps = {
    markdown: string;
    className?: string;
};

const REMARK_PLUGINS = [remarkBreaks, remarkGfm, remarkSmartypants];

const COMPONENTS = {
    h1: Heading,
    code: Code,
    img: Image,
    a: Anchor,
} as const;

/**
 * Render sanitised Markdown into a React element.
 *
 * Pipeline: preprocess (custom inline syntax) → ReactMarkdown
 * (remark + rehype + sanitize) → FancyboxClient (image lightbox).
 *
 * Custom syntax and the sanitisation allowlist live in `./preprocess` and
 * `./plugins`; the component itself is the thin shell that wires them.
 */
export function Markdown({markdown, className}: MarkdownProps) {
    const containerClassName = className ? `markdown-content ${className}` : 'markdown-content';

    return (
        <FancyboxClient className={containerClassName}>
            <ReactMarkdown
                remarkPlugins={REMARK_PLUGINS}
                remarkRehypeOptions={REMARK_REHYPE_OPTIONS}
                rehypePlugins={[
                    rehypeSlug,
                    [rehypeExternalLinks, REHYPE_EXTERNAL_LINKS_OPTIONS],
                    rehypeRaw,
                    [rehypeSanitize, REHYPE_SANITIZE_SCHEMA],
                    rehypeUnwrapImages,
                ]}
                components={COMPONENTS}
            >
                {preprocessMarkdown(markdown)}
            </ReactMarkdown>
        </FancyboxClient>
    );
}
