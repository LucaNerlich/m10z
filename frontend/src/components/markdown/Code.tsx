'use client';

import React from 'react';
import {Highlight} from 'prism-react-renderer';
import styles from './Code.module.css';

export type CodeProps = React.ComponentProps<'code'> & {
    inline?: boolean;
};

/**
 * Render inline code or a syntax-highlighted code block when a language is specified in `className`.
 *
 * If `className` contains a `language-{lang}` token, the component renders a highlighted block for that language;
 * otherwise it renders a plain inline `<code>` element.
 *
 * @param className - Optional CSS class(es). Include `language-{lang}` to enable syntax highlighting for `lang`.
 * @param inline - When true, always render as inline code regardless of `className`.
 * @returns A React element containing either plain inline code or a syntax-highlighted code block. 
 */
export function Code({className = '', children, inline = false, ...props}: CodeProps) {
    // Extract language from className (format: "language-{lang}")
    const languageMatch = className.match(/language-(\w+)/);
    const language = languageMatch ? languageMatch[1] : '';

    // For inline code or code without language, render plain code element
    if (inline || !language) {
        return (
            <code className={className} {...props}>
                {children}
            </code>
        );
    }

    // For code blocks with language, use prism-react-renderer
    const codeString = typeof children === 'string' ? children : String(children || '');

    // Extract safe HTML attributes for pre element (exclude ref and element-specific props)
    const {ref, ...restProps} = props;
    const preProps = restProps as Omit<React.ComponentProps<'code'>, 'ref'>;

    return (
        <Highlight code={codeString.trim()} language={language}>
            {({className: highlightClassName, style, tokens, getLineProps, getTokenProps}) => (
                <pre className={`${styles.pre} ${highlightClassName || ''}`} style={style} {...(preProps as React.ComponentProps<'pre'>)}>
                    <code className={styles.code}>
                        {tokens.map((line, i) => (
                            <div key={i} {...getLineProps({line})}>
                                {line.map((token, key) => (
                                    <span key={key} {...getTokenProps({token})} />
                                ))}
                            </div>
                        ))}
                    </code>
                </pre>
            )}
        </Highlight>
    );
}
