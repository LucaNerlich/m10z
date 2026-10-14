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

    // The shape Strapi actually produces for an anonymous public request: the
    // content-api strategy marks it authenticated with `credentials: null`. The
    // first version of this guard treated that as privileged and leaked drafts.
    test('denies anonymous requests even though Strapi marks them authenticated', () => {
        const ctx = {
            state: {auth: {strategy: {}, credentials: null, ability: null}, isAuthenticated: true},
        } as unknown as QueryContext;
        expect(mayRequestAnyStatus(ctx)).toBe(false);
    });
});

describe('forcePublishedStatus', () => {
    test('rewrites a draft override to published through the Koa request', () => {
        // Strapi hands policies `Object.assign({is, type}, ctx)`: a shallow copy in
        // which `query` (a prototype getter) is absent but `request` is present.
        const request = {query: {status: 'draft', 'fields[0]': 'title'}};
        const ctx = {state: {}, request};

        forcePublishedStatus(ctx);

        expect(request.query).toEqual({status: 'published', 'fields[0]': 'title'});
    });

    test('rewrites a draft override on a plain ctx.query too', () => {
        const ctx: QueryContext = {query: {status: 'draft'}};
        forcePublishedStatus(ctx);
        expect(ctx.query).toEqual({status: 'published'});
    });

    test('leaves an explicit published request untouched', () => {
        const request = {query: {status: 'published'}};
        forcePublishedStatus({request});
        expect(request.query).toEqual({status: 'published'});
    });

    test('does not add a status param when none was requested', () => {
        const request = {query: {'fields[0]': 'title'}};
        forcePublishedStatus({request});
        expect(request.query).toEqual({'fields[0]': 'title'});
    });

    test('is a no-op without a parsed query object', () => {
        expect(() => forcePublishedStatus(undefined)).not.toThrow();
        expect(() => forcePublishedStatus({})).not.toThrow();
        expect(() => forcePublishedStatus({request: {}})).not.toThrow();
        expect(() => forcePublishedStatus({request: {query: null}})).not.toThrow();
    });
});
