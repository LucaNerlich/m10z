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
 * Serialize a rendered `<svg>` for use as an `<img>` source.
 *
 * Mermaid sizes most diagram types with `width="100%"` plus an inline
 * `max-width`. That works inline, but the lightbox loads the markup as an image
 * where a percentage width has no containing block and the browser falls back to
 * a ~150px default. Copy the element, give it an explicit intrinsic size from
 * its viewBox, and drop the capping `max-width`.
 *
 * The live element is not touched, so the inline diagram keeps its fluid width.
 */
function serializeForLightbox(svg: SVGSVGElement): string {
    const clone = svg.cloneNode(true) as SVGSVGElement;

    const numericAttribute = (name: string): number | null => {
        const raw = svg.getAttribute(name);
        if (!raw || raw.trim().endsWith('%')) return null;
        const parsed = Number.parseFloat(raw);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    };

    const box = svg.viewBox?.baseVal;
    const ratio = box && box.width > 0 ? box.height / box.width : 1;
    // Only a pixel value is a usable hint: the stylesheet sets max-width: 100% on
    // every diagram, and parseFloat would read that as 100px.
    const computedMaxWidth = getComputedStyle(svg).maxWidth.trim();
    const maxWidth = computedMaxWidth.endsWith('px') ? Number.parseFloat(computedMaxWidth) : Number.NaN;

    const width =
        numericAttribute('width') ??
        (Number.isFinite(maxWidth) && maxWidth > 0 ? maxWidth : null) ??
        (box && box.width > 0 ? box.width : 800);
    const height = numericAttribute('height') ?? Math.round(width * ratio);

    clone.setAttribute('width', String(Math.round(width)));
    clone.setAttribute('height', String(height));
    clone.style?.removeProperty('max-width');

    return new XMLSerializer().serializeToString(clone);
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
    // Identity of the most recent render run. A resolution from an older run must
    // not write over a newer one: without this, changing `chart` while a render
    // is in flight can leave the *older* diagram on screen permanently, because
    // the resolution also stamps `renderedChartRef` and the skip-guard below then
    // suppresses the correction.
    const latestRunRef = useRef<string>('');

    // Initialize Mermaid once. startOnLoad: false prevents auto-scanning the DOM
    // (we render explicitly). securityLevel: 'strict' — diagrams never need
    // click handlers or raw HTML labels, and 'loose' would allow javascript:
    // links inside the SVG on click.
    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'strict',
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

        // Skip re-render if the chart source hasn't changed (prevents infinite render loops).
        if (trimmedChart === renderedChartRef.current && !error && dataUrl) return;

        dispatch({type: 'reset'});

        if (!trimmedChart) {
            dispatch({type: 'error', message: 'Empty Mermaid diagram'});
            return;
        }

        const chartId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        latestRunRef.current = chartId;

        mermaid
            .render(chartId, trimmedChart)
            .then(({svg}) => {
                // A newer run superseded this one; its result is the one to show.
                if (latestRunRef.current !== chartId) return;
                if (containerRef.current) {
                    containerRef.current.innerHTML = svg;
                    renderedChartRef.current = trimmedChart;
                    // Build the Fancybox href from the parsed SVG, not the raw string.
                    // 1. Mermaid returns HTML-flavoured markup for `htmlLabels` (e.g. an
                    //    unclosed `<br>` inside `<foreignObject>`). That parses fine inline
                    //    via innerHTML but is invalid XML, so the browser refuses to decode
                    //    it as a standalone `image/svg+xml` image. Re-serializing the parsed
                    //    element with XMLSerializer makes it well-formed.
                    // 2. Mermaid sizes many diagram types with `width="100%"` + `max-width`,
                    //    which also breaks once the SVG is loaded as an `<img>`; the helper
                    //    normalizes the intrinsic size.
                    const svgElement = containerRef.current.querySelector('svg');
                    const exportableSvg = svgElement ? serializeForLightbox(svgElement) : svg;
                    dispatch({type: 'rendered', dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(exportableSvg)}`});
                }
            })
            .catch((err) => {
                // Ignore a superseded run's failure too.
                if (latestRunRef.current !== chartId) return;
                const errorMessage = err instanceof Error ? err.message : String(err);
                dispatch({type: 'error', message: `Failed to render Mermaid diagram: ${errorMessage}`});
                console.error('Mermaid rendering error:', err);
            });
    }, [chart]);

    if (error) {
        return (
            <div className={className}>
                <div className={styles.error}>
                    <p>{error}</p>
                    <details>
                        <summary>Mermaid source</summary>
                        <pre className={styles.source}>{chart}</pre>
                    </details>
                </div>
                {/* Keep the render target mounted so a later valid chart can replace the error. */}
                <div
                    ref={containerRef}
                    className={styles.container}
                    style={{display: 'none'}}
                    aria-hidden="true"
                />
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

