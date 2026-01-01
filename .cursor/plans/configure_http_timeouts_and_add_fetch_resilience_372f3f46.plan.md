---
name: Configure HTTP timeouts and add fetch resilience
overview: Configure backend HTTP server timeouts and database connection pool settings to prevent premature socket closure during SSR requests. Add frontend fetch resilience with timeout handling, connection pooling, and error handling. Implement monitoring and structured logging for socket errors and connection health.
todos:
  - id: backend-server-timeouts
    content: "Configure HTTP server timeouts in backend/config/server.ts and backend/src/index.ts (keepAliveTimeout: 65s, headersTimeout: 66s, requestTimeout: 120s)"
    status: completed
  - id: backend-db-pool
    content: "Update database connection pool settings in backend/config/database.ts (max: 25, acquireConnectionTimeout: 30s, idleTimeoutMillis: 30s)"
    status: completed
  - id: backend-pool-monitoring
    content: Add Knex pool event handlers and health logging in backend/src/index.ts bootstrap function
    status: completed
    dependencies:
      - backend-db-pool
  - id: frontend-fetch-timeout
    content: Add timeout handling to fetchJson() in frontend/src/lib/strapiContent.ts with AbortController and error handling
    status: completed
  - id: frontend-fetch-agent
    content: Create frontend/src/lib/fetchAgent.ts with undici Agent configuration for connection pooling
    status: completed
  - id: frontend-instrumentation
    content: Create frontend/instrumentation.ts to initialize fetch agent on server startup
    status: completed
    dependencies:
      - frontend-fetch-agent
  - id: frontend-error-logging
    content: Add structured socket error logging to fetchJson() in frontend/src/lib/strapiContent.ts
    status: completed
    dependencies:
      - frontend-fetch-timeout
  - id: frontend-artikel-error-handling
    content: Add try-catch error handling to artikel/[slug]/page.tsx for fetch calls
    status: completed
    dependencies:
      - frontend-fetch-timeout
  - id: frontend-podcast-error-handling
    content: Add try-catch error handling to podcasts/[slug]/page.tsx for fetch calls
    status: completed
    dependencies:
      - frontend-fetch-timeout
  - id: frontend-category-error-handling
    content: Add try-catch error handling to kategorien/[slug]/page.tsx for fetch calls
    status: completed
    dependencies:
      - frontend-fetch-timeout
---

# Configure HTTP Timeouts and Add Fetch Resilience

This plan implements three tasks to improve connection reliability between the Next.js frontend and Strapi backend during SSR requests.

## Architecture Overview

```javascript
┌─────────────────┐         ┌──────────────────┐
│  Next.js SSR    │────────▶│  Strapi Backend   │
│  (Frontend)     │  HTTP   │  (HTTP Server)    │
└─────────────────┘         └──────────────────┘
         │                           │
         │                           ▼
         │                   ┌──────────────────┐
         │                   │  PostgreSQL DB   │
         │                   │  (Connection    │
         │                   │   Pool)         │
         │                   └──────────────────┘
         │
         ▼
┌─────────────────┐
│  undici Agent   │
│  (Connection    │
│   Pooling)      │
└─────────────────┘
```



## Task 1: Backend HTTP Server and Database Configuration

### 1.1 Update `backend/config/server.ts`

- Export a custom server configuration function that receives the HTTP server instance
- Configure timeout values:
- `keepAliveTimeout`: 65000ms (65 seconds)
- `headersTimeout`: 66000ms (66 seconds) 
- `requestTimeout`: 120000ms (120 seconds)
- Add documentation comments explaining timeout relationships and why these values prevent premature socket closure

**Note**: Strapi 5 doesn't directly expose the HTTP server in the config export. We'll need to configure it in `backend/src/index.ts` using the `register` hook to access `strapi.server.httpServer`.

### 1.2 Update `backend/src/index.ts`

- In the `register` function, access `strapi.server.httpServer` after server initialization
- Call the server configuration function from `backend/config/server.ts` to apply timeout settings
- Handle cases where the server might not be initialized yet

### 1.3 Update `backend/config/database.ts`

- Increase `pool.max` from 10 to 25 for both MySQL and PostgreSQL configurations
- Set `acquireConnectionTimeout` to 30000ms (30 seconds) - note: this is already configurable via env var, but we'll update the default
- Add `idleTimeoutMillis: 30000` to pool configuration
- Add documentation explaining pool sizing rationale (handling concurrent SSR requests, preventing connection exhaustion)

### 1.4 Add Database Pool Event Handlers

- In `backend/src/index.ts` bootstrap function, access the Knex connection instance via `strapi.db.connection`
- Set up event handlers for:
- `acquireSuccess`: Log successful connection acquisition
- `acquireFail`: Log failed connection attempts with error details
- `destroySuccess`: Log when connections are destroyed
- Log pool metrics (active, idle, waiting connections) on each event
- Add optional periodic pool health logging (every 60s) for development environment only
- Document metric interpretation for production monitoring

## Task 2: Frontend Fetch Resilience

### 2.1 Update `frontend/src/lib/strapiContent.ts`

- Modify `fetchJson()` function (currently at line 82) to accept optional `timeout` parameter (default: 30000ms)
- Create `AbortController` and attach signal to fetch request
- Implement `setTimeout` to abort after timeout duration
- Wrap fetch in try-catch to convert `AbortError` to descriptive timeout error
- Clean up timeout on successful completion or error
- Detect socket errors by checking for `UND_ERR_SOCKET` error code
- Add structured logging with `JSON.stringify` including:
- Error code
- Bytes read/written (if available)
- Addresses (local/remote)
- Timeout status
- URL
- Request context (slug, content type, populate options)

### 2.2 Create `frontend/src/lib/fetchAgent.ts`

- Import `Agent` and `setGlobalDispatcher` from `undici`
- Create server-only initialization function `initializeFetchAgent()`
- Configure agent with:
- `keepAliveTimeout: 60000` (60 seconds)
- `keepAliveMaxTimeout: 300000` (300 seconds)
- `connections: 100`
- `pipelining: 1`
- Add documentation about alignment with backend settings
- Use Next.js `server-only` package to ensure this only runs on server

### 2.3 Create `frontend/instrumentation.ts`

- Export `register` function (Next.js instrumentation API)
- Call `initializeFetchAgent()` from fetchAgent module
- Add error handling for initialization failures

### 2.4 Update Page Components

Update three page components to wrap fetch calls in try-catch blocks:**`frontend/app/artikel/[slug]/page.tsx`**:

- Wrap `fetchArticleBySlug()` calls in both `generateMetadata()` and default export
- Return `notFound()` for 404 errors
- Log and handle socket/timeout errors with fallback (return empty metadata object for `generateMetadata`, `notFound()` for page)
- Update error handling to detect `UND_ERR_SOCKET` and timeout errors

**`frontend/app/podcasts/[slug]/page.tsx`**:

- Same pattern as artikel page
- Wrap `fetchPodcastBySlug()` calls
- Handle 404s and socket/timeout errors gracefully

**`frontend/app/kategorien/[slug]/page.tsx`**:

- Wrap `fetchCategoryBySlug()` and batched fetch calls (`fetchArticlesBySlugsBatched`, `fetchPodcastsBySlugsBatched`)
- Handle 404s and socket/timeout errors
- For batched fetches, handle partial failures gracefully (show available content even if some fetches fail)

## Task 3: Monitoring and Structured Logging

### 3.1 Enhanced Error Logging in `frontend/src/lib/strapiContent.ts`

- Detect socket errors by checking error object for `code === 'UND_ERR_SOCKET'`
- Log structured error info using `JSON.stringify` with:
- `errorCode`: The error code (e.g., 'UND_ERR_SOCKET')
- `bytesRead`: Bytes read before error (if available)
- `bytesWritten`: Bytes written before error (if available)
- `localAddress`: Local socket address
- `remoteAddress`: Remote socket address
- `timeout`: Boolean indicating if timeout occurred
- `url`: The request URL
- `context`: Object with slug, content type, populate options
- Use console.error for structured logs (will be picked up by Next.js logging)

### 3.2 Database Pool Monitoring in `backend/src/index.ts`

- Access Knex pool via `strapi.db.connection.client.pool` (or equivalent based on Strapi's DB abstraction)
- Enable event handlers:
- `acquireSuccess`: Log with pool metrics
- `acquireFail`: Log error and pool state
- `destroySuccess`: Log connection cleanup
- Log pool metrics object containing:
- `active`: Number of active connections
- `idle`: Number of idle connections  
- `waiting`: Number of requests waiting for connection
- Add optional periodic health logging (every 60s) in development:
- Check if `NODE_ENV === 'development'`
- Use `setInterval` to log pool health metrics
- Clear interval on application shutdown
- Document metric interpretation:
- High `waiting` count indicates pool exhaustion
- `active` + `idle` should not exceed `max`
- Monitor for connection leaks (idle connections not being released)

## Implementation Notes

### Dependencies

- `undici` is built into Node.js 18+ and Next.js 16 uses it by default for fetch
- No additional packages needed for fetch agent configuration
- May need to add `server-only` package to frontend if not already present

### Error Handling Strategy

- Socket errors should be logged but not necessarily fail the entire request
- For `generateMetadata()`, return empty object on fetch failure (allows page to render with defaults)
- For page components, return `notFound()` on 404, but consider retry logic for transient socket errors
- Structured logging helps identify patterns in connection issues

### Testing Considerations

- Test timeout behavior by simulating slow backend responses
- Verify connection pooling reduces connection overhead
- Monitor pool metrics under load to validate sizing
- Test error recovery paths (socket errors, timeouts, 404s)

### Security Considerations

- Timeout values prevent resource exhaustion attacks
- Connection pool limits prevent database connection exhaustion
- Error messages should not expose sensitive backend details