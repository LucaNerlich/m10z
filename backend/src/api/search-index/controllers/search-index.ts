/**
 * search-index controller
 */

import crypto from 'crypto';
import {factories} from '@strapi/strapi';
import {getLastSearchIndexMetrics} from '../../../services/searchIndexBuilder';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateLimitState = new Map<string, {count: number; resetAt: number}>();

function normalizeSecret(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function verifySecret(provided: unknown, expected: unknown): boolean {
    const expectedValue = normalizeSecret(expected);
    const providedValue = normalizeSecret(provided);
    if (!expectedValue || !providedValue) return false;
    const expectedBuffer = Buffer.from(expectedValue);
    const providedBuffer = Buffer.from(providedValue);
    if (expectedBuffer.length !== providedBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

function getClientIp(ctx: any): string {
    const forwarded = ctx?.request?.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    return ctx?.request?.ip ?? ctx?.ip ?? 'unknown';
}

function checkRateLimit(key: string): {ok: boolean; retryAfterSeconds: number} {
    const now = Date.now();
    const existing = rateLimitState.get(key);
    if (!existing || now > existing.resetAt) {
        rateLimitState.set(key, {count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS});
        return {ok: true, retryAfterSeconds: 0};
    }
    if (existing.count >= RATE_LIMIT_MAX) {
        const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
        return {ok: false, retryAfterSeconds};
    }
    existing.count += 1;
    return {ok: true, retryAfterSeconds: 0};
}

export default factories.createCoreController('api::search-index.search-index', () => ({
    async metrics(ctx) {
        const expected = process.env.DIAGNOSTICS_TOKEN ?? null;
        const provided =
            ctx?.request?.query?.token ??
            ctx?.query?.token ??
            ctx?.request?.headers?.['x-m10z-diagnostics-token'];

        if (!verifySecret(provided, expected)) {
            ctx.status = 401;
            ctx.body = 'Unauthorized';
            return;
        }

        const ip = getClientIp(ctx);
        const rl = checkRateLimit(`search-index-metrics:${ip}`);
        if (!rl.ok) {
            ctx.status = 429;
            ctx.set('Retry-After', String(rl.retryAfterSeconds));
            ctx.body = 'Too Many Requests';
            return;
        }

        ctx.body = {
            now: Date.now(),
            metrics: getLastSearchIndexMetrics(),
        };
    },
}));
