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
import {SafeImage} from '@/src/components/SafeImage';

export type MarkdownProps = {
    markdown: string;
    className?: string;
};

/**
 * Safe-by-default Markdown renderer.
 * - Supports GitHub Flavored Markdown including tables and blockquotes.
 * - Supports markdown syntax for sub (~text~), sup (^text^), ins (++text++), and mark (==text==).
 * - Allows only specific HTML tags (ins, sup, sub, mark) with sanitization to prevent XSS.
 * - Demotes Markdown h1 to h2 so the page title can remain the only h1.
 */
export function Markdown({markdown, className}: MarkdownProps) {
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
    normalized = normalized.replace(/~([^~\n]+)~/g, '<sub>$1</sub>');

    return (
        <div className={className ? `markdown-content ${className}` : 'markdown-content'}>
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


