import fs from 'node:fs/promises';

function fmtMs(ms) {
  if (ms == null) return 'n/a';
  const n = Number(ms);
  if (!Number.isFinite(n)) return 'n/a';
  if (n < 1000) return `${n.toFixed(0)} ms`;
  return `${(n / 1000).toFixed(2)} s`;
}

function fmtNum(n) {
  if (n == null) return 'n/a';
  const v = Number(n);
  if (!Number.isFinite(v)) return 'n/a';
  return v.toLocaleString('en-US');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseSubmetricKey(key) {
  const brace = key.indexOf('{');
  if (brace === -1 || !key.endsWith('}')) return null;
  const base = key.slice(0, brace);
  const inside = key.slice(brace + 1, -1);
  const tags = {};
  for (const part of inside.split(',')) {
    const [k, v] = part.split(':');
    if (!k || v == null) continue;
    tags[k.trim()] = v.trim();
  }
  return {base, tags};
}

function getCounterCount(metric) {
  // Counter in summary-export commonly: {count, rate} or {values: {count}}
  return metric?.values?.count ?? metric?.count ?? null;
}

function getMetric(metrics, name) {
  return metrics?.[name] ?? null;
}

function getTrend(trend) {
  // k6 --summary-export format varies:
  // - Newer JSON exports often have stats at the top-level: {avg, med, "p(95)", ...}
  // - Some formats nest under {values: {...}}
  const values = trend?.values ?? trend ?? {};
  return {
    avg: values.avg,
    p50: values['p(50)'] ?? values.med,
    p90: values['p(90)'],
    p95: values['p(95)'],
    p99: values['p(99)'],
    max: values.max,
    min: values.min,
  };
}

function getRate(rate) {
  const values = rate?.values ?? rate ?? {};
  return {
    rate: values.rate ?? values.value,
    passes: values.passes,
    fails: values.fails,
  };
}

const [,, inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error('Usage: node report.mjs <summary.json> <report.html>');
  process.exit(2);
}

const raw = await fs.readFile(inputPath, 'utf8');
const summary = JSON.parse(raw);

const metrics = summary.metrics ?? {};
const duration = (summary.state?.testRunDurationMs ?? null);

const httpReqDuration = getTrend(getMetric(metrics, 'http_req_duration'));
const httpReqFailed = getRate(getMetric(metrics, 'http_req_failed'));
const httpReqs = getMetric(metrics, 'http_reqs')?.values?.count ?? getMetric(metrics, 'http_reqs')?.count ?? null;
const vusMax = getMetric(metrics, 'vus_max')?.values?.value ?? getMetric(metrics, 'vus_max')?.max ?? getMetric(metrics, 'vus_max')?.value ?? null;
const iterations = getMetric(metrics, 'iterations')?.values?.count ?? getMetric(metrics, 'iterations')?.count ?? null;
const approxFailedReqs =
  httpReqFailed.rate != null && httpReqs != null ? Math.round(Number(httpReqFailed.rate) * Number(httpReqs)) : null;

// Failure reasons (explicit counters show up in summary-export reliably)
const statusCounters = [
  {key: 'm10z_http_4xx', label: '4xx total'},
  {key: 'm10z_http_429', label: '429 Too Many Requests'},
  {key: 'm10z_http_5xx', label: '5xx total'},
  {key: 'm10z_http_500', label: '500 Internal Server Error'},
  {key: 'm10z_http_502', label: '502 Bad Gateway'},
  {key: 'm10z_http_503', label: '503 Service Unavailable'},
];

const statusCounterRows = statusCounters
  .map((c) => ({...c, count: getCounterCount(getMetric(metrics, c.key))}))
  .filter((r) => r.count != null)
  .map((r) => ({...r, count: Number(r.count)}));

const total4xx = statusCounterRows.find((r) => r.key === 'm10z_http_4xx')?.count ?? null;
const total5xx = statusCounterRows.find((r) => r.key === 'm10z_http_5xx')?.count ?? null;
const approxNon2xx3xx = (total4xx != null || total5xx != null) ? (Number(total4xx ?? 0) + Number(total5xx ?? 0)) : null;
const approxNon2xx3xxRate = (approxNon2xx3xx != null && httpReqs != null) ? (Number(approxNon2xx3xx) / Number(httpReqs)) : null;

// Failures by endpoint name (from explicit counters)
const failByNameCounters = [
  {key: 'm10z_fail_home', label: 'home'},
  {key: 'm10z_fail_articles', label: 'articles'},
  {key: 'm10z_fail_podcasts', label: 'podcasts'},
  {key: 'm10z_fail_api_contentfeed', label: 'api_contentfeed'},
  {key: 'm10z_fail_api_search', label: 'api_search'},
  {key: 'm10z_fail_audiofeed_xml', label: 'audiofeed_xml'},
];

const failByNameRows = failByNameCounters
  .map((c) => ({...c, count: getCounterCount(getMetric(metrics, c.key))}))
  .filter((r) => r.count != null && Number(r.count) > 0)
  .map((r) => ({...r, count: Number(r.count)}))
  .sort((a, b) => b.count - a.count);

const title = `k6 Report: ${escapeHtml(inputPath)}`;

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; color: #111; }
      h1 { margin: 0 0 8px; }
      .muted { color: #555; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; max-width: 1000px; }
      .card { border: 1px solid #ddd; border-radius: 12px; padding: 14px; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 6px 0; vertical-align: top; }
      td:first-child { color: #555; width: 45%; }
      code { background: #f6f6f6; padding: 2px 6px; border-radius: 6px; }
      pre { background: #0b1020; color: #e8e8e8; padding: 12px; border-radius: 12px; overflow: auto; }
      @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <div class="muted">Generated at <code>${new Date().toISOString()}</code></div>
    <div class="muted">Test duration: <code>${fmtMs(duration)}</code></div>

    <div class="grid" style="margin-top:16px">
      <div class="card">
        <h2 style="margin:0 0 8px">Throughput</h2>
        <table>
          <tr><td>HTTP requests</td><td><code>${fmtNum(httpReqs)}</code></td></tr>
          <tr><td>Iterations</td><td><code>${fmtNum(iterations)}</code></td></tr>
          <tr><td>Max VUs</td><td><code>${fmtNum(vusMax)}</code></td></tr>
        </table>
      </div>

      <div class="card">
        <h2 style="margin:0 0 8px">Errors</h2>
        <table>
          <tr><td>http_req_failed rate</td><td><code>${httpReqFailed.rate != null ? (httpReqFailed.rate * 100).toFixed(2) + '%' : 'n/a'}</code></td></tr>
          <tr><td>failed requests (approx)</td><td><code>${fmtNum(approxFailedReqs)}</code></td></tr>
          <tr><td>passes</td><td><code>${fmtNum(httpReqFailed.passes)}</code></td></tr>
          <tr><td>fails</td><td><code>${fmtNum(httpReqFailed.fails)}</code></td></tr>
        </table>
      </div>

      <div class="card">
        <h2 style="margin:0 0 8px">Latency (http_req_duration)</h2>
        <table>
          <tr><td>avg</td><td><code>${fmtMs(httpReqDuration.avg)}</code></td></tr>
          <tr><td>p50</td><td><code>${fmtMs(httpReqDuration.p50)}</code></td></tr>
          <tr><td>p90</td><td><code>${fmtMs(httpReqDuration.p90)}</code></td></tr>
          <tr><td>p95</td><td><code>${fmtMs(httpReqDuration.p95)}</code></td></tr>
          <tr><td>p99</td><td><code>${fmtMs(httpReqDuration.p99)}</code></td></tr>
          <tr><td>max</td><td><code>${fmtMs(httpReqDuration.max)}</code></td></tr>
        </table>
      </div>

      <div class="card">
        <h2 style="margin:0 0 8px">HTTP status breakdown</h2>
        ${
          statusCounterRows.length === 0
            ? `<div class="muted">No status counters found. Re-run the test after updating the scripts.</div>`
            : `
              <div class="muted">What caused failed requests (approx): <code>${approxNon2xx3xxRate != null ? (approxNon2xx3xxRate * 100).toFixed(2) + '%' : 'n/a'}</code></div>
              <table>
                ${statusCounterRows
                  .filter((r) => r.count > 0)
                  .map((r) => `<tr><td>${escapeHtml(r.label)}</td><td><code>${fmtNum(r.count)}</code></td></tr>`)
                  .join('') || '<tr><td colspan="2"><span class="muted">No 4xx/5xx responses recorded.</span></td></tr>'}
              </table>
            `
        }
      </div>

      <div class="card">
        <h2 style="margin:0 0 8px">Failures by endpoint</h2>
        ${
          failByNameRows.length === 0
            ? `<div class="muted">No endpoint failures recorded (no 4xx/5xx).</div>`
            : `
              <div class="muted">Where failures happened (based on our request <code>name</code> tags).</div>
              <table>
                ${failByNameRows.map((r) => `<tr><td>${escapeHtml(r.label)}</td><td><code>${fmtNum(r.count)}</code></td></tr>`).join('')}
              </table>
            `
        }
      </div>

      <div class="card">
        <h2 style="margin:0 0 8px">Raw summary JSON</h2>
        <div class="muted">Saved from k6 <code>--summary-export</code>.</div>
        <pre>${escapeHtml(raw)}</pre>
      </div>
    </div>
  </body>
</html>`;

await fs.writeFile(outputPath, html, 'utf8');
console.log(`Wrote ${outputPath}`);


