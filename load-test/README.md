# Load testing (k6)

This folder contains a **k6** load/performance test harness for your deployed site.

## Safety / rules

- **Only run against environments you own and are allowed to test.**
- Start with `smoke` (very low load), then increase gradually.
- Avoid running high-load tests from a single machine/network that could trip rate limits (feeds/search).

## Prerequisites

Use either:

- **k6 locally** (recommended): install k6 via your OS package manager, or
- **Docker**: run k6 from the official image.

## Configuration

All scripts read:

- `TARGET_ORIGIN` (**required**): origin like `https://example.com` (no trailing slash)
- `K6_INSECURE_SKIP_TLS_VERIFY` (optional): set to `true` only for local/self-signed testing

Optional knobs depend on the test (see each script header).

### `.env` (recommended)

Create `load-test/.env` (ignored by git) and put your prod target there:

```bash
cp load-test/env.example load-test/.env
```

## Run (local k6)

From repo root:

```bash
k6 run -e TARGET_ORIGIN="https://your-domain.tld" load-test/smoke.js
k6 run -e TARGET_ORIGIN="https://your-domain.tld" load-test/ramp.js
k6 run -e TARGET_ORIGIN="https://your-domain.tld" load-test/spike.js
```

## Run (Docker)

```bash
docker run --rm -i \
  -e TARGET_ORIGIN="https://your-domain.tld" \
  grafana/k6:latest run - < load-test/smoke.js
```

## Notes

- These tests intentionally **avoid hammering feed endpoints** (they can be expensive and may be rate limited).
- If you want to include authenticated/admin endpoints, do **not** hardcode tokens in scripts; pass them via env vars and avoid logging them.

## Using `load-test/package.json`

You can run everything from the `load-test/` folder:

```bash
cd load-test

# Create .env once (then just edit TARGET_ORIGIN there)
cp env.example .env

# Install deps (dotenv)
npm install

# Run tests via Docker k6 (reads .env / .env.local)
npm run smoke
npm run ramp
npm run spike

# Generate HTML reports from k6 summary exports
npm run report:smoke
npm run report:ramp
npm run report:spike
```

Reports are written to `load-test/reports/*.html`.


