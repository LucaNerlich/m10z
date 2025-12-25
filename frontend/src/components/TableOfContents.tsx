'use client';

import {useEffect, useRef, useState} from 'react';
import styles from './TableOfContents.module.css';

type Heading = {
    id: string;
    text: string;
    level: number;
};

type TableOfContentsProps = {
    contentRef: React.RefObject<HTMLElement | null>;
};

/**
 * Table of Contents component that extracts headings from content,
 * provides smooth scroll navigation, and tracks active sections.
 *
 * @param contentRef - Ref to the content container element
 * @returns A navigation element with table of contents, or null if no headings found
 */
export function TableOfContents({contentRef}: TableOfContentsProps) {
    const [headings, setHeadings] = useState<Heading[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    // Extract headings from DOM
    useEffect(() => {
        if (!contentRef.current) return;

        const headingElements = contentRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const extractedHeadings: Heading[] = [];

        headingElements.forEach((element) => {
            const id = element.id;
            if (!id) return; // Skip headings without IDs

            const text = element.textContent || '';
            const level = parseInt(element.tagName.substring(1), 10);

            extractedHeadings.push({
                id,
                text: text.replace(/#\s*$/, '').trim(), // Remove trailing anchor icon
                level,
            });
        });

        setHeadings(extractedHeadings);
    }, [contentRef]);

    // Set up IntersectionObserver to track active section
    useEffect(() => {
        if (!contentRef.current || headings.length === 0) return;

        const headingElements = headings
            .map((heading) => contentRef.current?.querySelector(`#${CSS.escape(heading.id)}`))
            .filter((el): el is Element => el !== null && el !== undefined);

        if (headingElements.length === 0) return;

        // Clean up previous observer
        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        // Create new observer
        observerRef.current = new IntersectionObserver(
            (entries) => {
                // Find the first visible heading
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const id = entry.target.id;
                        if (id) {
                            setActiveId(id);
                            break;
                        }
                    }
                }
            },
            {
                rootMargin: '-20% 0% -70% 0%', // Trigger slightly before heading enters viewport
                threshold: 0,
            },
        );

        // Observe all headings
        headingElements.forEach((element) => {
            observerRef.current?.observe(element);
        });

        // Cleanup on unmount
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [contentRef, headings]);

    // Handle smooth scroll on click
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const element = contentRef.current?.querySelector(`#${CSS.escape(id)}`);
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
            // Update URL hash without scrolling again
            if (typeof window !== 'undefined') {
                window.history.pushState(null, '', `#${id}`);
            }
        }
    };

    if (headings.length === 0) {
        return null;
    }

    return (
        <nav className={styles.toc} aria-label="Inhaltsverzeichnis">
            <h2>Inhaltsverzeichnis</h2>
            <ul className={styles.list}>
                {headings.map((heading) => {
                    const isActive = activeId === heading.id;
                    return (
                        <li
                            key={heading.id}
                            className={styles.item}
                            style={{paddingLeft: `${(heading.level - 2) * 1.5}rem`}}
                        >
                            <a
                                href={`#${heading.id}`}
                                onClick={(e) => handleClick(e, heading.id)}
                                className={`${styles.link} ${isActive ? styles.active : ''}`}
                                aria-current={isActive ? 'location' : undefined}
                            >
                                {heading.text}
                            </a>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

