import React from 'react';

/**
 * Heading component that demotes h1 to h2 in markdown content.
 * This ensures consistent heading hierarchy in articles.
 */
export function Heading({children, ...props}: React.ComponentProps<'h1'>) {
    return <h2 {...props}>{children}</h2>;
}

