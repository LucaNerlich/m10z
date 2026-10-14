import {describe, expect, test} from 'vitest';

import {forcePublishedStatus, mayRequestAnyStatus, type QueryContext} from './publishedStatus';

describe('mayRequestAnyStatus', () => {
    test('denies anonymous requests', () => {
        expect(mayRequestAnyStatus(undefined)).toBe(false);
        expect(mayRequestAnyStatus({})).toBe(false);
        expect(mayRequestAnyStatus({state: {}})).toBe(false);
    });

    test('allows API-token requests (authenticated without ctx.state.user)', () => {
        const ctx: QueryContext = {state: {auth: {credentials: {type: 'api-token'}}}};
        expect(mayRequestAnyStatus(ctx)).toBe(true);
    });

    test('denies users-permissions requests, which set ctx.state.user', () => {
        const ctx: QueryContext = {state: {auth: {credentials: {}}, user: {id: 1}}};
        expect(mayRequestAnyStatus(ctx)).toBe(false);
    });
});

describe('forcePublishedStatus', () => {
    test('rewrites a draft override to published in place', () => {
        const ctx: QueryContext = {query: {status: 'draft', 'fields[0]': 'title'}};
        forcePublishedStatus(ctx);
        expect(ctx.query).toEqual({status: 'published', 'fields[0]': 'title'});
    });

    test('leaves an explicit published request untouched', () => {
        const ctx: QueryContext = {query: {status: 'published'}};
        forcePublishedStatus(ctx);
        expect(ctx.query).toEqual({status: 'published'});
    });

    test('does not add a status param when none was requested', () => {
        const ctx: QueryContext = {query: {'fields[0]': 'title'}};
        forcePublishedStatus(ctx);
        expect(ctx.query).toEqual({'fields[0]': 'title'});
    });

    test('is a no-op without a parsed query object', () => {
        expect(() => forcePublishedStatus(undefined)).not.toThrow();
        expect(() => forcePublishedStatus({})).not.toThrow();
    });
});
