import {describe, expect, it, vi} from 'vitest';

import {
    buildAssetLabel,
    buildInstructions,
    chunk,
    estimateCost,
    extractJsonObject,
    isBlank,
    isRasterImageMime,
    mapPool,
    type McpAsset,
    normalizeListPayload,
    opencodeAuthPath,
    parseArgs,
    parseProposals,
    pickUpdates,
    resolveAssetUrl,
    resolveMcpOrigin,
    selectAssets,
    toGatewayModelId,
    withRetry,
} from './captionImagesUtils';

const asset = (overrides: Partial<McpAsset> = {}): McpAsset => ({
    id: 1,
    name: 'cover.jpg',
    url: '/uploads/cover.jpg',
    mime: 'image/jpeg',
    alternativeText: null,
    caption: null,
    ...overrides,
});

describe('parseArgs', () => {
    it('defaults to a dry run scoped to images missing alt or caption', () => {
        const args = parseArgs([]);
        expect(args.apply).toBe(false);
        expect(args.force).toBe(false);
        expect(args.local).toBe(false);
        expect(args.limit).toBeNull();
        expect(args.batchSize).toBe(4);
        expect(args.pageSize).toBe(100);
    });

    it('parses flags with separate and inline values', () => {
        const args = parseArgs([
            '--apply',
            '--force',
            '--local',
            '--limit',
            '10',
            '--model=opencode-go/other',
            '--batch-size',
            '2',
            '--page-size=50',
            '--concurrency',
            '3',
            '--out',
            'manifest.json',
        ]);
        expect(args).toMatchObject({
            apply: true,
            force: true,
            local: true,
            limit: 10,
            model: 'opencode-go/other',
            batchSize: 2,
            pageSize: 50,
            concurrency: 3,
            out: 'manifest.json',
        });
    });

    it('ignores a bare -- separator', () => {
        expect(parseArgs(['--', '--limit', '5']).limit).toBe(5);
    });

    it('treats --dry-run as the default and disables a prior --apply', () => {
        expect(parseArgs(['--apply', '--dry-run']).apply).toBe(false);
    });

    it('rejects unknown flags and missing or invalid values', () => {
        expect(() => parseArgs(['--nope'])).toThrow(/Unknown argument/);
        expect(() => parseArgs(['--limit'])).toThrow(/Missing value/);
        expect(() => parseArgs(['--limit', '0'])).toThrow(/positive integer/);
        expect(() => parseArgs(['--limit', 'abc'])).toThrow(/positive integer/);
        expect(() => parseArgs(['positional'])).toThrow(
            /Unexpected positional/
        );
    });
});

describe('isBlank', () => {
    it('treats null, undefined and whitespace as blank', () => {
        expect(isBlank(null)).toBe(true);
        expect(isBlank(undefined)).toBe(true);
        expect(isBlank('   ')).toBe(true);
        expect(isBlank('')).toBe(true);
    });

    it('treats real content as present', () => {
        expect(isBlank('Alt')).toBe(false);
        expect(isBlank(0)).toBe(false);
    });
});

describe('isRasterImageMime', () => {
    it('accepts raster types and rejects SVG, audio and garbage', () => {
        expect(isRasterImageMime('image/jpeg')).toBe(true);
        expect(isRasterImageMime('image/png')).toBe(true);
        expect(isRasterImageMime('IMAGE/WEBP')).toBe(true);
        expect(isRasterImageMime('image/svg+xml')).toBe(false);
        expect(isRasterImageMime('audio/mpeg')).toBe(false);
        expect(isRasterImageMime(null)).toBe(false);
    });
});

describe('selectAssets', () => {
    it('keeps only raster images missing alt or caption by default', () => {
        const assets = [
            asset({id: 1, alternativeText: null, caption: null}),
            asset({id: 2, alternativeText: 'vorhanden', caption: null}),
            asset({id: 3, alternativeText: 'vorhanden', caption: 'vorhanden'}),
            asset({id: 4, mime: 'image/svg+xml'}),
            asset({id: 5, mime: 'audio/mpeg'}),
            asset({id: 6, url: ''}),
        ];
        expect(
            selectAssets(assets, {force: false, limit: null}).map(
                (item) => item.id
            )
        ).toEqual([1, 2]);
    });

    it('returns every raster image under force, capped by limit', () => {
        const assets = [
            asset({id: 1, alternativeText: 'a', caption: 'b'}),
            asset({id: 2, alternativeText: 'a', caption: 'b'}),
            asset({id: 3, alternativeText: 'a', caption: 'b'}),
        ];
        expect(
            selectAssets(assets, {force: true, limit: null}).map(
                (item) => item.id
            )
        ).toEqual([1, 2, 3]);
        expect(
            selectAssets(assets, {force: true, limit: 2}).map((item) => item.id)
        ).toEqual([1, 2]);
    });
});

describe('URL helpers', () => {
    it('derives the CMS origin from the MCP endpoint', () => {
        expect(resolveMcpOrigin('https://cms.m10z.de/mcp')).toBe(
            'https://cms.m10z.de'
        );
        expect(resolveMcpOrigin('http://localhost:1337/mcp')).toBe(
            'http://localhost:1337'
        );
    });

    it('resolves relative and absolute asset URLs', () => {
        expect(resolveAssetUrl('/uploads/a.jpg', 'https://cms.m10z.de')).toBe(
            'https://cms.m10z.de/uploads/a.jpg'
        );
        expect(resolveAssetUrl('uploads/a.jpg', 'https://cms.m10z.de')).toBe(
            'https://cms.m10z.de/uploads/a.jpg'
        );
        expect(
            resolveAssetUrl('https://cdn.example/a.jpg', 'https://cms.m10z.de')
        ).toBe('https://cdn.example/a.jpg');
    });
});

describe('toGatewayModelId', () => {
    it('strips the opencode provider prefix the gateway rejects', () => {
        expect(toGatewayModelId('opencode-go/deepseek-v4.1-flash')).toBe(
            'deepseek-v4.1-flash'
        );
        expect(toGatewayModelId('deepseek-v4.1-flash')).toBe(
            'deepseek-v4.1-flash'
        );
    });
});

describe('prompt helpers', () => {
    it('labels assets with id and file name', () => {
        expect(buildAssetLabel({id: 7, name: 'cover.jpg'})).toBe(
            'id=7, Dateiname: cover.jpg'
        );
        expect(buildAssetLabel({id: 8, name: null})).toBe(
            'id=8, Dateiname: (ohne Namen)'
        );
    });

    it('states the batch size', () => {
        expect(buildInstructions(3)).toContain('3 Bilder');
    });
});

describe('extractJsonObject', () => {
    it('parses plain JSON', () => {
        expect(extractJsonObject('{"a":1}')).toEqual({a: 1});
    });

    it('strips code fences and surrounding prose', () => {
        expect(extractJsonObject('Hier:\n```json\n{"a":1}\n```\n')).toEqual({
            a: 1,
        });
        expect(extractJsonObject('text {"a":1} trailing')).toEqual({a: 1});
    });

    it('throws when there is no JSON object', () => {
        expect(() => extractJsonObject('nope')).toThrow();
        expect(() => extractJsonObject(null)).toThrow();
    });
});

describe('parseProposals', () => {
    it('keeps valid entries and drops invalid ones', () => {
        const proposals = parseProposals({
            results: [
                {id: 1, alternativeText: ' Alt ', caption: ' Caption '},
                {id: '2', alternativeText: 'Alt 2', caption: 'Caption 2'},
                {id: 3, alternativeText: '', caption: 'Caption 3'},
                {id: 4, alternativeText: 'Alt 4', caption: ''},
                {alternativeText: 'kein id', caption: 'x'},
                null,
            ],
        });
        expect(proposals).toEqual([
            {id: 1, alternativeText: 'Alt', caption: 'Caption'},
            {id: 2, alternativeText: 'Alt 2', caption: 'Caption 2'},
        ]);
    });

    it('accepts a bare array and rejects a non-array payload', () => {
        expect(
            parseProposals([{id: 1, alternativeText: 'a', caption: 'b'}])
        ).toHaveLength(1);
        expect(() => parseProposals({})).toThrow(/results/);
    });
});

describe('pickUpdates', () => {
    const proposal = {id: 1, alternativeText: 'Alt', caption: 'Caption'};

    it('fills only the blank fields by default', () => {
        expect(
            pickUpdates(
                asset({alternativeText: 'vorhanden', caption: null}),
                proposal,
                false
            )
        ).toEqual({
            caption: 'Caption',
        });
        expect(
            pickUpdates(
                asset({alternativeText: null, caption: 'vorhanden'}),
                proposal,
                false
            )
        ).toEqual({
            alternativeText: 'Alt',
        });
    });

    it('writes both fields under force', () => {
        expect(
            pickUpdates(
                asset({alternativeText: 'x', caption: 'y'}),
                proposal,
                true
            )
        ).toEqual({
            alternativeText: 'Alt',
            caption: 'Caption',
        });
    });
});

describe('normalizeListPayload', () => {
    it('reads a paginated payload', () => {
        expect(
            normalizeListPayload<number>({
                results: [1, 2],
                pagination: {pageCount: 2, total: 3},
            })
        ).toEqual({
            results: [1, 2],
            pageCount: 2,
            total: 3,
        });
    });

    it('reads a bare array and a data wrapper', () => {
        expect(normalizeListPayload<number>([1])).toEqual({
            results: [1],
            pageCount: null,
            total: null,
        });
        expect(normalizeListPayload<number>({data: [1]})).toEqual({
            results: [1],
            pageCount: null,
            total: null,
        });
    });

    it('falls back to an empty result for unknown shapes', () => {
        expect(normalizeListPayload<number>({}).results).toEqual([]);
        expect(normalizeListPayload<number>(null).results).toEqual([]);
    });
});

describe('chunk', () => {
    it('splits into fixed-size chunks', () => {
        expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
        expect(chunk([], 2)).toEqual([]);
    });
});

describe('mapPool', () => {
    it('maps every item while respecting the concurrency limit', async () => {
        let active = 0;
        let peak = 0;
        const results = await mapPool([1, 2, 3, 4, 5], 2, async (value) => {
            active += 1;
            peak = Math.max(peak, active);
            await new Promise((resolve) => setTimeout(resolve, 5));
            active -= 1;
            return value * 2;
        });
        expect(results).toEqual([2, 4, 6, 8, 10]);
        expect(peak).toBeLessThanOrEqual(2);
    });
});

describe('withRetry', () => {
    it('retries until success', async () => {
        vi.useFakeTimers();
        try {
            let calls = 0;
            const promise = withRetry(
                async () => {
                    calls += 1;
                    if (calls < 3) throw new Error('boom');
                    return 'ok';
                },
                {attempts: 3, baseDelayMs: 10}
            );
            await vi.runAllTimersAsync();
            await expect(promise).resolves.toBe('ok');
            expect(calls).toBe(3);
        } finally {
            vi.useRealTimers();
        }
    });

    it('rethrows the last error after exhausting attempts', async () => {
        vi.useFakeTimers();
        try {
            const promise = withRetry(
                async () => {
                    throw new Error('always');
                },
                {attempts: 2, baseDelayMs: 10}
            );
            const assertion = expect(promise).rejects.toThrow('always');
            await vi.runAllTimersAsync();
            await assertion;
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('opencodeAuthPath', () => {
    it('respects XDG_DATA_HOME and falls back to the home directory', () => {
        expect(opencodeAuthPath({XDG_DATA_HOME: '/data'}, '/home/u')).toBe(
            '/data/opencode/auth.json'
        );
        expect(opencodeAuthPath({}, '/home/u')).toBe(
            '/home/u/.local/share/opencode/auth.json'
        );
        expect(opencodeAuthPath({XDG_DATA_HOME: '   '}, '/home/u')).toBe(
            '/home/u/.local/share/opencode/auth.json'
        );
    });
});

describe('estimateCost', () => {
    it('prices known models and returns null for unknown ones', () => {
        expect(
            estimateCost(
                'opencode-go/deepseek-v4.1-flash',
                1_000_000,
                1_000_000
            )
        ).toBeCloseTo(0.75, 5);
        expect(estimateCost('unknown', 1, 1)).toBeNull();
    });
});
