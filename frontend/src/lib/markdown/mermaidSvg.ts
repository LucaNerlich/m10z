/**
 * Helpers for turning a rendered Mermaid SVG into a lightbox-friendly image.
 *
 * Mermaid sizes most diagram types with `width="100%"` plus an inline
 * `max-width`. That works for the inline SVG preview, but the lightbox loads
 * the diagram as an `<img>` where the percentage width has no containing block
 * and the browser falls back to a ~150px default. The diagram then shows up
 * tiny and stretched.
 *
 * `normalizeMermaidSvg` rewrites the root `<svg>` to carry explicit pixel
 * `width`/`height` (derived from the `max-width` hint and `viewBox` aspect
 * ratio) so the lightbox image has a correct intrinsic size.
 */

const OPEN_TAG_RE = /^<svg\b([^>]*)>/i;
const ATTRIBUTE_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g;
const MAX_WIDTH_RE = /max-width:\s*([\d.]+)px/i;

type SvgAttributes = Map<string, string>;

function parseAttributes(raw: string): SvgAttributes {
    const attributes: SvgAttributes = new Map();
    for (const match of raw.matchAll(ATTRIBUTE_RE)) {
        attributes.set(match[1], match[2]);
    }
    return attributes;
}

function parsePositiveNumber(value: string | undefined): number | null {
    if (!value || value.trim().endsWith('%')) return null;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseViewBox(value: string | undefined): {width: number; height: number} | null {
    if (!value) return null;
    const parts = value.trim().split(/[\s,]+/).map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null;
    if (parts[2] <= 0 || parts[3] <= 0) return null;
    return {width: parts[2], height: parts[3]};
}

/**
 * Rewrite the root `<svg>` so it reports an explicit intrinsic size.
 *
 * SVGs that already have both a numeric width and height are returned
 * unchanged. Everything else is resized using the inline `max-width` hint
 * (when present), the `viewBox` aspect ratio, or a sane fallback.
 *
 * @param svg - The SVG markup returned by `mermaid.render`
 * @returns SVG markup with explicit pixel `width`/`height` on the root element
 */
export function normalizeMermaidSvg(svg: string): string {
    const openTagMatch = svg.match(OPEN_TAG_RE);
    if (!openTagMatch) return svg;

    const attributes = parseAttributes(openTagMatch[1]);
    const width = parsePositiveNumber(attributes.get('width'));
    const height = parsePositiveNumber(attributes.get('height'));
    const viewBox = parseViewBox(attributes.get('viewBox') ?? attributes.get('viewbox'));

    // Already has a usable intrinsic size.
    if (width !== null && height !== null) return svg;

    const style = attributes.get('style') ?? '';
    const maxWidthMatch = style.match(MAX_WIDTH_RE);
    const maxWidth = maxWidthMatch ? Number.parseFloat(maxWidthMatch[1]) : null;
    const ratio = viewBox ? viewBox.height / viewBox.width : null;

    let targetWidth = width;
    if (targetWidth === null) {
        if (maxWidth !== null && Number.isFinite(maxWidth) && maxWidth > 0) {
            targetWidth = maxWidth;
        } else if (height !== null && ratio !== null) {
            targetWidth = height / ratio;
        } else if (viewBox) {
            targetWidth = viewBox.width;
        } else {
            targetWidth = 800;
        }
    }

    let targetHeight = height;
    if (targetHeight === null) {
        targetHeight = ratio !== null ? targetWidth * ratio : targetWidth;
    }

    attributes.set('width', String(Math.round(targetWidth)));
    attributes.set('height', String(Math.round(targetHeight)));

    // An inline max-width would cap the explicit width inside the lightbox image.
    if (style) {
        const cleanedStyle = style
            .replace(/;?\s*max-width:\s*[\d.]+px;?/i, ';')
            .replace(/;+/g, ';')
            .replace(/^;|;$/g, '')
            .trim();
        if (cleanedStyle) {
            attributes.set('style', cleanedStyle);
        } else {
            attributes.delete('style');
        }
    }

    const normalizedOpenTag = `<svg${Array.from(attributes, ([name, value]) => ` ${name}="${value}"`).join('')}>`;
    return normalizedOpenTag + svg.slice(openTagMatch[0].length);
}

/**
 * Build a data URL that can be consumed by an `<img>` (e.g. Fancybox) from a
 * rendered Mermaid SVG, normalizing its intrinsic size first.
 *
 * @param svg - The SVG markup returned by `mermaid.render`
 * @returns A `data:image/svg+xml` URL with an explicit, correctly sized viewport
 */
export function mermaidSvgToDataUrl(svg: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalizeMermaidSvg(svg))}`;
}
