import {useEffect, useState} from 'react';

import {Box, Button, Flex, Table, Tbody, Td, Th, Thead, Tr, Typography} from '@strapi/design-system';
import {Widget, useFetchClient} from '@strapi/strapi/admin';

import {PLUGIN_ID} from '../pluginId';

type RangeKey = '7d' | '30d' | '6m';

const RANGE_ORDER: Array<RangeKey> = ['7d', '30d', '6m'];

const RANGE_LABELS: Record<RangeKey, string> = {
    '7d': '7 Tage',
    '30d': '30 Tage',
    '6m': '6 Monate',
};

interface RangeStats {
    startAt: string;
    endAt: string;
    pageviews: number;
    visitors: number;
    visits: number;
    podcastDownloads: number;
}

interface TopSlug {
    slug: string;
    downloads: number;
}

interface DashboardPayload {
    ranges: Record<RangeKey, RangeStats>;
    topSlugs: Record<RangeKey, Array<TopSlug>>;
    cachedAt: string;
    cacheTtlSeconds: number;
}

type Status = 'loading' | 'unconfigured' | 'forbidden' | 'error' | 'empty' | 'ready';

const numberFormat = new Intl.NumberFormat('de-DE');
const dateTimeFormat = new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

function formatNumber(value: unknown): string {
    return typeof value === 'number' && Number.isFinite(value) ? numberFormat.format(value) : '–';
}

function formatDateTime(value: unknown): string {
    if (typeof value !== 'string') return '–';
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? '–' : dateTimeFormat.format(new Date(time));
}

function isRangeStats(value: unknown): value is RangeStats {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Record<string, unknown>;
    return (
        typeof candidate.pageviews === 'number' &&
        typeof candidate.visitors === 'number' &&
        typeof candidate.visits === 'number' &&
        typeof candidate.podcastDownloads === 'number'
    );
}

function isDashboardPayload(value: unknown): value is DashboardPayload {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as {ranges?: unknown; topSlugs?: unknown};
    if (!candidate.ranges || typeof candidate.ranges !== 'object') return false;
    const ranges = candidate.ranges as Record<string, unknown>;
    return RANGE_ORDER.every((key) => isRangeStats(ranges[key]));
}

/**
 * Extract the HTTP status from a fetch-client failure, covering both the
 * top-level `status` and the nested axios-style `response.status` shapes.
 */
function getResponseStatus(error: unknown): number | null {
    if (!error || typeof error !== 'object') return null;
    const {status, response} = error as {status?: unknown; response?: unknown};
    if (typeof status === 'number') return status;
    if (response && typeof response === 'object') {
        const nested = (response as {status?: unknown}).status;
        if (typeof nested === 'number') return nested;
    }
    return null;
}

const METRIC_ROWS: Array<{label: string; getValue: (range: RangeStats) => number}> = [
    {label: 'Seitenaufrufe', getValue: (range) => range.pageviews},
    {label: 'Besucher', getValue: (range) => range.visitors},
    {label: 'Besuche', getValue: (range) => range.visits},
    {label: 'Podcast-Downloads', getValue: (range) => range.podcastDownloads},
];

export function UmamiStatsWidget() {
    const {get} = useFetchClient();
    const [status, setStatus] = useState<Status>('loading');
    const [payload, setPayload] = useState<DashboardPayload | null>(null);
    const [selectedRange, setSelectedRange] = useState<RangeKey>('30d');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const {data} = await get<DashboardPayload>(`${PLUGIN_ID}/stats`);
                if (cancelled) return;
                if (isDashboardPayload(data)) {
                    setPayload(data);
                    setStatus('ready');
                } else {
                    setStatus('empty');
                }
            } catch (error) {
                if (cancelled) return;
                const httpStatus = getResponseStatus(error);
                if (httpStatus === 503) {
                    setStatus('unconfigured');
                } else if (httpStatus === 403) {
                    setStatus('forbidden');
                } else {
                    setStatus('error');
                }
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    if (status === 'loading') {
        return <Widget.Loading />;
    }

    if (status === 'unconfigured') {
        return (
            <Widget.NoData>
                {'Umami ist nicht konfiguriert. Bitte UMAMI_HOST, UMAMI_USERNAME, UMAMI_PASSWORD und UMAMI_WEBSITE_ID setzen.'}
            </Widget.NoData>
        );
    }

    if (status === 'forbidden') {
        return <Widget.NoPermissions />;
    }

    if (status === 'error') {
        return <Widget.Error>{'Die Website-Statistiken konnten nicht geladen werden.'}</Widget.Error>;
    }

    if (status === 'empty' || !payload) {
        return <Widget.NoData>{'Keine Statistiken verfügbar.'}</Widget.NoData>;
    }

    const topSlugs = payload.topSlugs[selectedRange] ?? [];

    return (
        <Box>
            <Table colCount={RANGE_ORDER.length + 1} rowCount={METRIC_ROWS.length + 1}>
                <Thead>
                    <Tr>
                        <Th>
                            <Typography variant="sigma">Kennzahl</Typography>
                        </Th>
                        {RANGE_ORDER.map((key) => (
                            <Th key={key}>
                                <Typography variant="sigma">{RANGE_LABELS[key]}</Typography>
                            </Th>
                        ))}
                    </Tr>
                </Thead>
                <Tbody>
                    {METRIC_ROWS.map((row) => (
                        <Tr key={row.label}>
                            <Td>
                                <Typography variant="omega">{row.label}</Typography>
                            </Td>
                            {RANGE_ORDER.map((key) => (
                                <Td key={key}>
                                    <Typography variant="omega" fontWeight="bold">
                                        {formatNumber(row.getValue(payload.ranges[key]))}
                                    </Typography>
                                </Td>
                            ))}
                        </Tr>
                    ))}
                </Tbody>
            </Table>
            <Box paddingTop={4} paddingBottom={2}>
                <Typography variant="delta">Top-Episoden</Typography>
            </Box>
            <Flex gap={2} paddingBottom={2}>
                {RANGE_ORDER.map((key) => (
                    <Button
                        key={key}
                        size="S"
                        variant={key === selectedRange ? 'default' : 'tertiary'}
                        onClick={() => setSelectedRange(key)}
                    >
                        {RANGE_LABELS[key]}
                    </Button>
                ))}
            </Flex>
            {topSlugs.length === 0 ? (
                <Typography variant="omega" textColor="neutral600">
                    Keine Podcast-Downloads in diesem Zeitraum.
                </Typography>
            ) : (
                <Table colCount={2} rowCount={topSlugs.length + 1}>
                    <Thead>
                        <Tr>
                            <Th>
                                <Typography variant="sigma">Episode (Slug)</Typography>
                            </Th>
                            <Th>
                                <Typography variant="sigma">Downloads</Typography>
                            </Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {topSlugs.map((entry) => (
                            <Tr key={entry.slug}>
                                <Td>
                                    <Typography variant="omega">{entry.slug}</Typography>
                                </Td>
                                <Td>
                                    <Typography variant="omega" fontWeight="bold">
                                        {formatNumber(entry.downloads)}
                                    </Typography>
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            )}
            <Box paddingTop={2}>
                <Typography variant="pi" textColor="neutral600">
                    {`Stand: ${formatDateTime(payload.cachedAt)}`}
                </Typography>
            </Box>
        </Box>
    );
}
