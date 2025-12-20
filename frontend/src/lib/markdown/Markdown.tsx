import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';

export type MarkdownProps = {
  markdown: string;
  className?: string;
};

/**
 * Safe-by-default Markdown renderer.
 * - Does NOT enable raw HTML parsing (prevents XSS vectors).
 * - Demotes Markdown h1 to h2 so the page title can remain the only h1.
 */
export function Markdown({ markdown, className }: MarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          h1: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}


