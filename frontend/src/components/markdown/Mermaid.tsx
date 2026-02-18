'use client';

import React, {useEffect, useReducer, useRef} from 'react';
import mermaid from 'mermaid';
import styles from './Mermaid.module.css';
import {umamiEventId} from '@/src/lib/analytics/umami';

export type MermaidProps = {
    chart: string;
    className?: string;
};

type MermaidState = {
    error: string | null;
    dataUrl: string | null;
};

type MermaidAction =
    | {type: 'reset'}
    | {type: 'error'; message: string}
    | {type: 'rendered'; dataUrl: string};

function mermaidReducer(state: MermaidState, action: MermaidAction): MermaidState {
    switch (action.type) {
        case 'reset':
            return {error: null, dataUrl: null};
        case 'error':
            return {error: action.message, dataUrl: null};
        case 'rendered':
            return {error: null, dataUrl: action.dataUrl};
    }
}

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
    const [{error, dataUrl}, dispatch] = useReducer(mermaidReducer, {error: null, dataUrl: null});
    const renderedChartRef = useRef<string>('');

    useEffect(() => {
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

        if (trimmedChart === renderedChartRef.current && !error && dataUrl) return;

        dispatch({type: 'reset'});

        if (!trimmedChart) {
            dispatch({type: 'error', message: 'Empty Mermaid diagram'});
            return;
        }

        const chartId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;

        mermaid
            .render(chartId, trimmedChart)
            .then(({svg}) => {
                if (containerRef.current) {
                    containerRef.current.innerHTML = svg;
                    renderedChartRef.current = trimmedChart;
                    const encodedSvg = encodeURIComponent(svg);
                    dispatch({type: 'rendered', dataUrl: `data:image/svg+xml;charset=utf-8,${encodedSvg}`});
                }
            })
            .catch((err) => {
                const errorMessage = err instanceof Error ? err.message : String(err);
                dispatch({type: 'error', message: `Failed to render Mermaid diagram: ${errorMessage}`});
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
            data-umami-event={umamiEventId(['article', 'mermaid', 'open'])}
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

