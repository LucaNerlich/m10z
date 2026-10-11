import React from 'react';
import {type ExtraProps} from 'react-markdown';

type HeadingProps = React.ComponentProps<'h1'> & ExtraProps;

/**
 * Demotes an `h1` heading to an `h2` for markdown-rendered content to preserve heading hierarchy.
 *
 * @param children - The content to render inside the heading.
 * @param props - Additional `h1`-style props forwarded to the rendered `h2` element.
 * @returns An `h2` React element with the provided props and children.
 */
// react-markdown passes its internal hast `node`; drop it so it never reaches the DOM.
export function Heading({children, node: _node, ...props}: HeadingProps) {
    return <h2 {...props}>{children}</h2>;
}
