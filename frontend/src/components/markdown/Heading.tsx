import React from 'react';

/**
 * Demotes an `h1` heading to an `h2` for markdown-rendered content to preserve heading hierarchy.
 *
 * @param children - The content to render inside the heading.
 * @param props - Additional `h1`-style props forwarded to the rendered `h2` element.
 * @returns An `h2` React element with the provided props and children.
 */
export function Heading({children, ...props}: React.ComponentProps<'h1'>) {
    return <h2 {...props}>{children}</h2>;
}
