'use client';

import React, {useEffect, useRef, useState} from 'react';
import mermaid from 'mermaid';
import styles from './Mermaid.module.css';

export type MermaidProps = {
    chart: string;
    className?: string;
};

/**
 * Render a Mermaid diagram from markdown code blocks.
 *
 * This component initializes Mermaid on first render and renders diagrams
 * from markdown code blocks with `language-mermaid` or `language-mermaidjs`.
 * The diagram is wrapped in a Fancybox link so it can be opened in a lightbox for better viewing.
 *
 * @param chart - The Mermaid diagram source code
 * @param className - Optional CSS class(es) to add to the container
 * @returns A React element containing the rendered Mermaid diagram wrapped in a Fancybox link
 */
export function Mermaid({chart, className}: MermaidProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const linkRef = useRef<HTMLAnchorElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [dataUrl, setDataUrl] = useState<string | null>(null);
    const renderedChartRef = useRef<string>('');

    useEffect(() => {
        // Initialize Mermaid with configuration optimized for readability
        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'inherit',
            fontSize: 16,
            flowchart: {
                useMaxWidth: false,
                htmlLabels: true,
                curve: 'basis',
            },
            sequence: {
                useMaxWidth: false,
            },
            gantt: {
                useMaxWidth: false,
            },
        });
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;

        const trimmedChart = chart.trim();

        // Skip if this chart was already rendered
        if (trimmedChart === renderedChartRef.current && !error && dataUrl) return;

        // Reset error state when chart changes
        if (error) {
            setError(null);
        }
        if (dataUrl) {
            setDataUrl(null);
        }

        if (!trimmedChart) {
            setError('Empty Mermaid diagram');
            return;
        }

        const chartId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;

        // Render the diagram
        mermaid
            .render(chartId, trimmedChart)
            .then(({svg}) => {
                if (containerRef.current) {
                    // Create a preview SVG for the container
                    containerRef.current.innerHTML = svg;
                    renderedChartRef.current = trimmedChart;

                    // Convert SVG to data URL for Fancybox
                    // Encode the SVG as a data URL so Fancybox can display it
                    const encodedSvg = encodeURIComponent(svg);
                    const url = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
                    setDataUrl(url);
                }
            })
            .catch((err) => {
                const errorMessage = err instanceof Error ? err.message : String(err);
                setError(`Failed to render Mermaid diagram: ${errorMessage}`);
                console.error('Mermaid rendering error:', err);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chart]);

    if (error) {
        return (
            <div className={`${styles.error} ${className || ''}`}>
                <p>{error}</p>
                <details>
                    <summary>Mermaid source</summary>
                    <pre className={styles.source}>{chart}</pre>
                </details>
            </div>
        );
    }

    return (
        <a
            ref={linkRef}
            href={dataUrl || '#'}
            data-fancybox="article-gallery"
            data-type="image"
            aria-label="View Mermaid diagram in full size"
            className={`${styles.link} ${className || ''}`}
        >
            <div
                ref={containerRef}
                className={styles.container}
                aria-label="Mermaid diagram preview"
            />
            <span className={styles.hint}>Click to view full size</span>
        </a>
    );
}

