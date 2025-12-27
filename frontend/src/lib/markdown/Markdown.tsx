'use client';

import React, {useEffect, useRef} from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkSmartypants from 'remark-smartypants';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, {defaultSchema} from 'rehype-sanitize';
import {toAbsoluteUrl} from '@/src/lib/strapi';
import {isInternalLink, routes} from '@/src/lib/routes';
import {SafeImage} from '@/src/components/SafeImage';
import '@fancyapps/ui/dist/fancybox/fancybox.css';

export type MarkdownProps = {
    markdown: string;
    className?: string;
};

/**
 * Render sanitized Markdown into HTML with extended inline syntax and image gallery support.
 *
 * Supports GitHub Flavored Markdown, converts inline extensions (==mark==, ++ins++, ^sup^, ~sub~),
 * demotes top-level headings (h1 → h2), and initializes Fancybox for images grouped by
 * `data-fancybox="article-gallery"`. HTML is parsed then sanitized with an extended schema
 * that allows `ins`, `sup`, `sub`, and `mark`.
 *
 * @param markdown - The Markdown source to render.
 * @param className - Optional additional CSS class(es) added to the container.
 * @returns The rendered Markdown content as a React element.
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

    // Normalize common inline <br> tags to Markdown line breaks without enabling raw HTML.
    let normalized = markdown.replace(/<br\s*\/?>/gi, '  \n');

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
                    [
                        rehypeAutolinkHeadings,
                        {
                            behavior: 'append',
                            properties: {
                                className: ['anchor-link'],
                                'aria-label': 'Link to section',
                            },
                            content: {
                                type: 'element',
                                tagName: 'span',
                                properties: {
                                    className: ['anchor-icon'],
                                    'aria-hidden': 'true',
                                },
                                children: [{type: 'text', value: '#'}],
                            },
                        },
                    ],
                    [rehypeExternalLinks, {target: '_blank', rel: ['noopener', 'noreferrer']}],
                    // Parse HTML tags (required before sanitization)
                    rehypeRaw,
                    // Sanitize HTML: extend default schema to allow ins, sup, and sub tags
                    [
                        rehypeSanitize,
                        {
                            ...defaultSchema,
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
                    h1: ({children, ...props}) => <h2 {...props}>{children}</h2>,
                    img: ({src, alt = ''}) => {
                        if (!src || typeof src !== 'string') return null;
                        const url = /^https?:\/\//i.test(src) ? src : toAbsoluteUrl(src);
                        // Use sensible defaults; Next/Image needs concrete dimensions.
                        // SafeImage handles unauthorized external domains gracefully.
                        return (
                            <a
                                href={url}
                                data-fancybox="article-gallery"
                                aria-label={`View image: ${alt || 'Gallery image'}`}
                                style={{display: 'inline-block', width: '100%'}}
                            >
                                <SafeImage
                                    src={url}
                                    alt={alt}
                                    width={1200}
                                    height={675}
                                    sizes="100vw"
                                    style={{height: 'auto', width: '100%'}}
                                />
                            </a>
                        );
                    },
                    a: ({href, children, className, id, ...props}) => {
                        if (!href) {
                            return <a href={href} className={className} id={id} {...props}>{children}</a>;
                        }

                        // Convert absolute SITE_URL links to relative paths
                        let processedHref = href;
                        if (href.startsWith(routes.siteUrl)) {
                            // Remove the domain portion, preserve path, query params, and hash
                            processedHref = href.substring(routes.siteUrl.length) || '/';
                        }

                        // Determine if link is internal
                        const isInternal = isInternalLink(href);
                        const isAnchorLink = href.startsWith('#');

                        // Build props for Link component - Next.js Link forwards props to underlying <a>
                        const linkProps: React.ComponentProps<typeof Link> & Record<string, unknown> = {
                            href: processedHref,
                        };

                        // Forward className
                        if (className) {
                            linkProps.className = className;
                        }

                        // Forward id
                        if (id) {
                            linkProps.id = id;
                        }

                        // Add security attributes for external links (but not anchor links)
                        if (!isInternal && !isAnchorLink) {
                            linkProps.target = '_blank';
                            linkProps.rel = 'noopener noreferrer';
                        }

                        // Forward aria-* and other anchor attributes - Link will pass them to <a>
                        Object.keys(props).forEach((key) => {
                            const value = (props as Record<string, unknown>)[key];
                            // Forward aria-* attributes and other standard anchor attributes
                            if (key.startsWith('aria-') || key === 'title' || key === 'download') {
                                linkProps[key] = value;
                            }
                        });

                        return (
                            <Link {...linkProps}>
                                {children}
                            </Link>
                        );
                    },
                }}
            >
                {normalized}
            </ReactMarkdown>
        </div>
    );
}

