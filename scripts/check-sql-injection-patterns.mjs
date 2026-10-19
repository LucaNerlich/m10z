#!/usr/bin/env node
/**
 * CI entry point for the SQL-injection guardrail.
 *
 * The detector lives in `backend/scripts/` so the backend Vitest suite can
 * import it inside the backend-only Docker build context (where the repo root
 * is not present). This wrapper keeps the documented invocation path stable.
 *
 * Usage: node scripts/check-sql-injection-patterns.mjs
 */

import {main} from '../backend/scripts/check-sql-injection-patterns.mjs';

main();
