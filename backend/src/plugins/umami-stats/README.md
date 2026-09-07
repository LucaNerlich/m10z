# umami-stats

Local Strapi plugin that adds an **Umami-Statistiken** widget to the admin
dashboard. It shows m10z.de website views (pageviews, visitors, visits) and
the custom `podcast-download` event with its `slug` property breakdown, each
for the ranges **7 days**, **30 days**, and **6 months**.

## How it works

- The widget (`admin/`) calls `GET /admin/umami-stats/stats` via the admin
  fetch client (authenticated admin session, no extra token needed).
- The server (`server/`) proxies three Umami endpoints with username/password
  auth and returns pre-aggregated numbers:
  - `GET /api/websites/:websiteId/stats` → pageviews, visitors, visits
  - `GET /api/websites/:websiteId/event-data/values?event=podcast-download&propertyName=slug`
    → per-episode downloads (top 10) and the range total (sum over all slugs)
- The bearer token is cached in memory and renewed on 401; the aggregated
  payload is cached for 10 minutes and shared between concurrent callers.
- Umami credentials never leave the server and are never logged.

## Configuration (environment variables)

| Variable           | Description                                  |
|--------------------|----------------------------------------------|
| `UMAMI_HOST`       | Umami base URL, e.g. `https://umami.m10z.de` |
| `UMAMI_USERNAME`   | Umami username                               |
| `UMAMI_PASSWORD`   | Umami password                               |
| `UMAMI_WEBSITE_ID` | Umami website id for m10z.de                 |

While any variable is missing, the route answers `503` and the widget shows
a setup hint instead of failing Strapi at boot time.

## Files

- `strapi-server.js` / `server/` — plain JavaScript (loaded directly by
  Node.js, no transpilation): routes, controller, service, Umami client,
  pure helpers, unit tests.
- `strapi-admin.js` / `admin/src/` — TypeScript, compiled by the Strapi admin
  build: widget registration and the `UmamiStatsWidget` component (German UI).
