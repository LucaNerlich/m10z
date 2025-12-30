'use client';

import React, {useEffect, useRef} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkSmartypants from 'remark-smartypants';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeSlug from 'rehype-slug';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, {defaultSchema} from 'rehype-sanitize';
import {Code} from '@/src/components/markdown/Code';
import {Heading} from '@/src/components/markdown/Heading';
import {Image} from '@/src/components/markdown/Image';
import {Anchor} from '@/src/components/markdown/Anchor';
import '@fancyapps/ui/dist/fancybox/fancybox.css';

export type MarkdownProps = {
    markdown: string;
    className?: string;
};

/**
 * Render sanitized Markdown into a React element with extended inline syntax and image gallery support.
 *
 * Converts inline extensions (==mark==, ++ins++, ^sup^, ~sub~), strips inline `<br>` tags,
 * enables GitHub Flavored Markdown and smart typographic replacements, and initializes Fancybox
 * for images grouped by `data-fancybox="article-gallery"`. HTML in the Markdown is parsed then
 * sanitized with an extended schema that allows `ins`, `sup`, `sub`, and `mark` tags.
 *
 * @param markdown - The Markdown source to render.
 * @param className - Optional additional CSS class(es) added to the container.
 * @returns A React element containing the rendered and sanitized Markdown content.
 */
export function Markdown({markdown, className}: MarkdownProps) {
    const contentRef = useRef<HTMLDivElement>(null);

    // Initialize Fancybox for image galleries
    useEffect(() => {
        if (!contentRef.current) return;

        // Dynamically import Fancybox to ensure SSR compatibility
        let isMounted = true;
        const cleanupPromise = import('@fancyapps/ui/dist/fancybox/').then(({Fancybox}) => {
            if (!isMounted || !contentRef.current) return;

            // Bind Fancybox to all elements with data-fancybox="article-gallery"
            // Fancybox automatically groups items by their data-fancybox value
            Fancybox.bind(contentRef.current, '[data-fancybox="article-gallery"]');
        });

        // Cleanup on unmount
        return () => {
            isMounted = false;
            cleanupPromise.then(() => {
                // Re-import for cleanup (module is cached, so this is fast)
                import('@fancyapps/ui/dist/fancybox/').then(({Fancybox}) => {
                    if (contentRef.current) {
                        Fancybox.unbind(contentRef.current);
                    }
                    Fancybox.close();
                });
            });
        };
    }, []);

    // Remove inline <br>, to avoid large gaps. Markdown Parsing already handles linebreaks via \n.
    let normalized = markdown.replace(/<br\s*\/?>/gi, '');

    // Convert markdown syntax to HTML tags for sub, sup, ins, and mark
    // Process in order to avoid conflicts: mark first, then ins, then sup/sub
    // Marked text: ==text== -> <mark>text</mark> (common markdown extension)
    normalized = normalized.replace(/==([^=\n]+)==/g, '<mark>$1</mark>');
    // Inserted text: ++text++ -> <ins>text</ins>
    normalized = normalized.replace(/\+\+([^+\n]+)\+\+/g, '<ins>$1</ins>');
    // Superscript: ^text^ -> <sup>text</sup>
    normalized = normalized.replace(/\^([^\^\n]+)\^/g, '<sup>$1</sup>');
    // Subscript: ~text~ -> <sub>text</sub>
    // Use negative lookbehind/lookahead to avoid collision with GFM strikethrough (~~text~~)
    // Only match single tildes that are not part of double-tildes
    normalized = normalized.replace(/(?<!~)~([^~\n]+)~(?!~)/g, '<sub>$1</sub>');

    return (
        <div ref={contentRef} className={className ? `markdown-content ${className}` : 'markdown-content'}>
            <ReactMarkdown
                remarkPlugins={[
                    remarkBreaks,
                    remarkGfm,
                    remarkSmartypants,
                ]}
                rehypePlugins={[
                    rehypeSlug,
                    [rehypeExternalLinks, {target: '_blank', rel: ['noopener', 'noreferrer']}],
                    // Parse HTML tags (required before sanitization)
                    rehypeRaw,
                    // Sanitize HTML: extend default schema to allow ins, sup, and sub tags
                    [
                        rehypeSanitize,
                        {
                            ...defaultSchema,
                            // clobberPrefix defaults to 'user-content-' for security against DOM clobbering
                            clobberPrefix: 'uc-',
                            tagNames: [...(defaultSchema.tagNames || []), 'ins', 'sup', 'sub', 'mark'],
                            // No additional attributes allowed for these tags to prevent XSS
                            attributes: {
                                ...defaultSchema.attributes,
                                ins: [],
                                sup: [],
                                sub: [],
                                mark: [],
                            },
                        },
                    ],
                ]}
                components={{
                    h1: Heading,
                    code: Code,
                    img: Image,
                    a: Anchor,
                }}
            >
                {normalized}
            </ReactMarkdown>
        </div>
    );
}
