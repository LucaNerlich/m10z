import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkSmartypants from 'remark-smartypants';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import {toAbsoluteUrl} from '@/src/lib/strapi';
import {SafeImage} from '@/src/components/SafeImage';

export type MarkdownProps = {
    markdown: string;
    className?: string;
};

/**
 * Safe-by-default Markdown renderer.
 * - Does NOT enable raw HTML parsing (prevents XSS vectors).
 * - Demotes Markdown h1 to h2 so the page title can remain the only h1.
 */
export function Markdown({markdown, className}: MarkdownProps) {
    // Normalize common inline <br> tags to Markdown line breaks without enabling raw HTML.
    const normalized = markdown.replace(/<br\s*\/?>/gi, '  \n');

    return (
        <div className={className}>
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
                ]}
                components={{
                    h1: ({children, ...props}) => <h2 {...props}>{children}</h2>,
                    img: ({src, alt = ''}) => {
                        if (!src || typeof src !== 'string') return null;
                        const url = /^https?:\/\//i.test(src) ? src : toAbsoluteUrl(src);
                        // Use sensible defaults; Next/Image needs concrete dimensions.
                        // SafeImage handles unauthorized external domains gracefully.
                        return (
                            <SafeImage
                                src={url}
                                alt={alt}
                                width={1200}
                                height={675}
                                sizes="100vw"
                                style={{height: 'auto', width: '100%'}}
                            />
                        );
                    },
                }}
            >
                {normalized}
            </ReactMarkdown>
        </div>
    );
}


