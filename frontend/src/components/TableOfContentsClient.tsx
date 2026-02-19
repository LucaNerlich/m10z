'use client';

import {useEffect, useState} from 'react';

import {type HeadingItem} from '@/src/lib/markdown/extractHeadings';

import styles from './TableOfContents.module.css';

type TableOfContentsClientProps = {
    headings: HeadingItem[];
};

/**
 * Client-side TOC interactivity: reads heading IDs from the DOM,
 * tracks the active heading via IntersectionObserver, and renders
 * clickable links with active-state highlighting.
 */
export function TableOfContentsClient({headings}: TableOfContentsClientProps) {
    const [activeIndex, setActiveIndex] = useState(-1);
    const [headingEls, setHeadingEls] = useState<HTMLElement[]>([]);

    useEffect(() => {
        // Find heading elements in the rendered markdown content.
        // Query by tag name matching the depths we extracted.
        const container = document.querySelector('.markdown-content');
        if (!container) return;

        const selectors = [...new Set(headings.map((h) => `h${h.depth}`))].join(', ');
        const elements = Array.from(container.querySelectorAll<HTMLElement>(selectors));
        setHeadingEls(elements);

        if (elements.length === 0) return;

        // The observer fires for headings entering/leaving the top portion
        // of the viewport (below the sticky header, top ~34% of the screen).
        const observer = new IntersectionObserver(
            (entries) => {
                // Find the topmost visible heading (lowest DOM index)
                let minIdx = Infinity;
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const idx = elements.indexOf(entry.target as HTMLElement);
                        if (idx !== -1 && idx < minIdx) {
                            minIdx = idx;
                        }
                    }
                }
                if (minIdx !== Infinity) {
                    setActiveIndex(minIdx);
                }
            },
            {
                // Observe intersections relative to a narrow band at the top of
                // the viewport, just below the sticky header.
                rootMargin: '-60px 0px -66% 0px',
            }
        );

        for (const el of elements) {
            observer.observe(el);
        }

        return () => {
            observer.disconnect();
        };
    }, [headings]);

    return (
        <nav className={styles.nav} aria-label='Inhaltsverzeichnis'>
            <p className={styles.title}>Inhalt</p>
            <ol className={styles.list}>
                {headings.map((heading, index) => {
                    const el = headingEls[index];
                    const href = el?.id ? `#${el.id}` : undefined;
                    const depthClass =
                        heading.depth === 2
                            ? styles.depth2
                            : heading.depth === 3
                              ? styles.depth3
                              : styles.depth4;
                    const linkClass = [
                        styles.link,
                        depthClass,
                        index === activeIndex ? styles.active : '',
                    ]
                        .filter(Boolean)
                        .join(' ');

                    return (
                        <li key={index}>
                            <a className={linkClass} href={href}>
                                {heading.text}
                            </a>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
