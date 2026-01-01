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
 *
 * @param chart - The Mermaid diagram source code
 * @param className - Optional CSS class(es) to add to the container
 * @returns A React element containing the rendered Mermaid diagram
 */
export function Mermaid({chart, className}: MermaidProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const renderedChartRef = useRef<string>('');

    useEffect(() => {
        // Initialize Mermaid with default configuration
        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'inherit',
        });
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;

        const trimmedChart = chart.trim();

        // Skip if this chart was already rendered
        if (trimmedChart === renderedChartRef.current && !error) return;

        // Reset error state when chart changes
        if (error) {
            setError(null);
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
                    containerRef.current.innerHTML = svg;
                    renderedChartRef.current = trimmedChart;
                }
            })
            .catch((err) => {
                const errorMessage = err instanceof Error ? err.message : String(err);
                setError(`Failed to render Mermaid diagram: ${errorMessage}`);
                console.error('Mermaid rendering error:', err);
            });
    }, [chart, error]);

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
        <div
            ref={containerRef}
            className={`${styles.container} ${className || ''}`}
            aria-label="Mermaid diagram"
        />
    );
}

