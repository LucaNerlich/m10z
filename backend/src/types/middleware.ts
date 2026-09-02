/**
 * Type definitions for Strapi middleware context and related types.
 *
 * These are deliberately *minimal structural* contracts: they describe exactly
 * the surface this codebase relies on, keeping hand-written middlewares/crons
 * decoupled from Strapi internals while avoiding `any` (same house pattern as
 * `StrapiDb`/`StrapiWithDb` in the service layer).
 */

export interface StrapiLogger {
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
}

/** Reference to an uploaded file — upload-plugin record or embedded relation. */
export interface FileReference {
    id?: number | string;
    documentId?: string;
    name?: string;
    url?: string;
}

/** One node of Strapi's rich-text (ProseMirror-style) document tree. */
export interface RichTextBlock {
    type: string;
    text?: string;
    children?: RichTextBlock[];
    content?: RichTextBlock[];
}

export interface PodcastDocument {
    id?: number | string;
    documentId?: string;
    slug?: string | null;
    title?: string;
    file?: FileReference | FileReference[];
    duration?: number;
    wordCount?: number;
    shownotes?: string | RichTextBlock[];
    content?: string | RichTextBlock[];
}

export interface ArticleDocument {
    id?: number | string;
    documentId?: string;
    slug?: string | null;
    title?: string;
    content?: string | RichTextBlock[];
    wordCount?: number;
}

/**
 * Generic document shape as returned by document-service reads in this codebase
 * (crons/middlewares select only a few fields per query, so every field is optional).
 */
export interface ContentDocument {
    id?: number | string;
    documentId?: string;
    slug?: string | null;
    title?: string | null;
    description?: string | null;
    date?: string | null;
    publishedAt?: string | null;
    updatedAt?: string | null;
    url?: string;
    mime?: string;
    blurhash?: string | null;
    file?: FileReference | FileReference[] | null;
    content?: string | RichTextBlock[];
    shownotes?: string | RichTextBlock[];
    version?: number;
    [key: string]: unknown;
}

/** Params accepted by document-service read/write methods used here. */
export type DocumentServiceParams = Record<string, unknown>;

export interface DocumentServiceMethods {
    findOne(params: DocumentServiceParams): Promise<ContentDocument | null>;
    findMany(params?: DocumentServiceParams): Promise<ContentDocument[]>;
    update(params: {documentId: string | number; data: Record<string, unknown>}): Promise<ContentDocument | null>;
    create(params: {data: Record<string, unknown>}): Promise<ContentDocument>;
    publish(params: {documentId: string | number}): Promise<ContentDocument | null>;
    unpublish(params: {documentId: string | number}): Promise<ContentDocument | null>;
}

/** The Document Service: callable per UID, plus `.use()` for middleware registration. */
export interface DocumentsService {
    (uid: string): DocumentServiceMethods;
    use: (middleware: DocumentServiceMiddleware) => void;
}

/** Subset of the knex pool used for connection monitoring. */
export interface ConnectionPoolLike {
    numUsed: () => number;
    numFree: () => number;
    numPendingAcquires: () => number;
    on: (event: string, listener: (err: Error) => void) => void;
}

/** Row-level query builder subset (per table). */
export interface KnexTableRowQuery {
    insert(row: Record<string, unknown>): {returning(column: string): Promise<Array<{id: number} | number>>};
    where(clause: Record<string, unknown>): {delete(): Promise<number>};
    where(column: string, operator: string, value: unknown): KnexTableRowQuery;
    orderBy(column: string, direction: 'asc' | 'desc'): KnexTableRowQuery;
    limit(count: number): KnexTableRowQuery;
    select(...columns: string[]): Promise<Array<Record<string, unknown>>>;
    delete(): Promise<number>;
}

/** Column-level builder subset used when creating tables. */
export interface KnexTableBuilder {
    increments: (name: string) => {primary: () => void};
    text: (name: string) => {notNullable: () => void};
    timestamp: (name: string) => {defaultTo: (value: unknown) => void};
}

/** Schema-builder subset. */
export interface KnexSchemaBuilder {
    hasTable(name: string): Promise<boolean>;
    createTable(name: string, callback: (table: KnexTableBuilder) => void): Promise<void>;
}

/** knex connection subset: callable per table plus schema/raw/client helpers. */
export interface KnexConnection {
    (table: string): KnexTableRowQuery;
    schema: KnexSchemaBuilder;
    fn: {now: () => unknown};
    raw(sql: string, bindings?: readonly unknown[]): Promise<{rows?: Array<Record<string, unknown>>}>;
    client?: {pool?: ConnectionPoolLike};
    destroy(): Promise<void>;
}

/** Database facade subset (query engine + knex connection). */
export interface DatabaseLike {
    query(uid: string): {
        updateMany(params: {where: Record<string, unknown>; data: Record<string, unknown>}): Promise<unknown>;
    };
    connection: KnexConnection;
}

export interface HttpServerLike {
    close(callback: (err?: unknown) => void): void;
}

/** Strapi static/public directories subset. */
export interface StrapiDirsLike {
    public?: string;
    static?: {
        public?: string;
    };
}

export interface StrapiInstance {
    log: StrapiLogger;
    db: DatabaseLike;
    server?: {
        httpServer?: HttpServerLike;
    };
    dirs?: StrapiDirsLike;
    documents: DocumentsService;
    plugin?: (name: string) =>
        | {
            contentTypes?: {
                file?: {
                    attributes?: Record<string, unknown>;
                };
            };
          }
        | undefined;
}

export interface DocumentServiceContext {
    uid?: string;
    action: string;
    params?: {
        strapi?: StrapiInstance;
        locale?: string;
        data?: ArticleDocument | PodcastDocument;
        where?: {documentId?: string; id?: number | string};
        documentId?: string;
        /** Bulk Document Service actions (`deleteMany`, `publishMany`, `unpublishMany`). */
        documentIds?: string[];
        status?: string;
    };
    contentType?: {
        uid: string;
        modelName: string;
    };
}

export type DocumentServiceNext = () => Promise<unknown>;

export type DocumentServiceMiddleware = (
    context: DocumentServiceContext,
    next: DocumentServiceNext
) => Promise<unknown>;
