import {describe, expect, it} from 'vitest';

import {mermaidSvgToDataUrl, normalizeMermaidSvg} from './mermaidSvg';

const FLOWCHART_SVG =
    '<svg id="mmd-1" width="480.390625" xmlns="http://www.w3.org/2000/svg" class="flowchart" height="556.8748779296875" viewBox="0 0 480.390625 556.8748779296875" role="graphics-document"><style>#mmd-1{fill:#333;}</style><rect/></svg>';

// Class/state/ER/pie/timeline diagrams: percentage width + inline max-width.
const CLASS_SVG =
    '<svg id="mmd-2" width="100%" xmlns="http://www.w3.org/2000/svg" style="max-width: 161.0078125px;" viewBox="0 0 161.0078125 150" role="graphics-document"><g><text>Animal</text></g></svg>';

const JOURNEY_SVG =
    '<svg id="mmd-3" width="100%" xmlns="http://www.w3.org/2000/svg" height="565" style="max-width: 700px;" viewBox="0 0 732 565"><g/></svg>';

describe('normalizeMermaidSvg', () => {
    it('leaves SVGs that already have an explicit intrinsic size untouched', () => {
        expect(normalizeMermaidSvg(FLOWCHART_SVG)).toBe(FLOWCHART_SVG);
    });

    it('derives width and height from the max-width hint and viewBox', () => {
        const normalized = normalizeMermaidSvg(CLASS_SVG);

        expect(normalized).toContain('<svg');
        expect(normalized).toContain('width="161"');
        expect(normalized).toContain('height="150"');
        expect(normalized).toContain('viewBox="0 0 161.0078125 150"');
        expect(normalized).not.toContain('max-width');
        expect(normalized).not.toContain('width="100%"');
    });

    it('keeps an explicit height and applies the max-width as the width', () => {
        const normalized = normalizeMermaidSvg(JOURNEY_SVG);

        expect(normalized).toContain('width="700"');
        expect(normalized).toContain('height="565"');
        expect(normalized).not.toContain('max-width');
    });

    it('falls back to the viewBox dimensions when no width or max-width exists', () => {
        const svg = '<svg width="100%" viewBox="0 0 236 322"><g/></svg>';
        const normalized = normalizeMermaidSvg(svg);

        expect(normalized).toContain('width="236"');
        expect(normalized).toContain('height="322"');
    });

    it('preserves unrelated attributes and non-max-width styles', () => {
        const svg =
            '<svg width="100%" xmlns="http://www.w3.org/2000/svg" class="flowchart" style="background: white; max-width: 300px; color: red;" viewBox="0 0 300 200"><g/></svg>';
        const normalized = normalizeMermaidSvg(svg);

        expect(normalized).toContain('xmlns="http://www.w3.org/2000/svg"');
        expect(normalized).toContain('class="flowchart"');
        expect(normalized).toContain('style="background: white; color: red"');
        expect(normalized).toContain('width="300"');
        expect(normalized).toContain('height="200"');
    });

    it('returns the input unchanged when there is no root svg element', () => {
        expect(normalizeMermaidSvg('<div>not an svg</div>')).toBe('<div>not an svg</div>');
    });
});

describe('mermaidSvgToDataUrl', () => {
    it('encodes the normalized SVG as an svg data URL', () => {
        const url = mermaidSvgToDataUrl(CLASS_SVG);

        expect(url.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
        expect(decodeURIComponent(url.slice('data:image/svg+xml;charset=utf-8,'.length))).toBe(
            normalizeMermaidSvg(CLASS_SVG),
        );
    });
});
