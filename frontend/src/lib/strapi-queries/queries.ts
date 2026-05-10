/**
 * Strapi query-string builders.
 *
 * Each helper expresses a *kind* of read (single by slug, multi by slugs,
 * paginated list) and hides:
 *
 *   - the `qs` library and its `encodeValuesOnly` option
 *   - the literal shape of `filters: {slug: {$eq | $in: …}}`
 *   - the placement of `pagination`, `populate`, `fields`, `status`, `sort`
 *
 * Callers express *intent* — what entity, what slug, what populate preset —
 * and the helpers translate that into a Strapi-compatible query string.
 */

import qs from 'qs';

const QS_OPTS = {encodeValuesOnly: true} as const;

export type StrapiContentStatus = 'published' | 'draft';

/** Build a query for fetching a single entity by slug (`pageSize: 1`). */
export function buildBySlugQuery(args: {
    slug: string;
    populate: object;
    fields: readonly string[];
    status?: StrapiContentStatus;
}): string {
    return qs.stringify(
        {
            filters: {slug: {$eq: args.slug}},
            status: args.status,
            populate: args.populate,
            fields: args.fields,
            pagination: {pageSize: 1},
        },
        QS_OPTS,
    );
}

/** Build a query for fetching multiple entities by slug list. */
export function buildBySlugsQuery(args: {
    slugs: string[];
    pageSize: number;
    populate: object;
    fields: readonly string[];
    status?: StrapiContentStatus;
}): string {
    return qs.stringify(
        {
            filters: {slug: {$in: args.slugs}},
            status: args.status,
            populate: args.populate,
            fields: args.fields,
            pagination: {pageSize: args.pageSize},
        },
        QS_OPTS,
    );
}

/** Build a query for a paginated list. */
export function buildListQuery(args: {
    page: number;
    pageSize: number;
    populate: object;
    fields: readonly string[];
    sort?: readonly string[];
    status?: StrapiContentStatus;
    filters?: Record<string, unknown>;
}): string {
    return qs.stringify(
        {
            sort: args.sort,
            status: args.status,
            ...(args.filters ? {filters: args.filters} : {}),
            pagination: {pageSize: args.pageSize, page: args.page},
            populate: args.populate,
            fields: args.fields,
        },
        QS_OPTS,
    );
}
