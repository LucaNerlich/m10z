/**
 * Type definitions for Strapi middleware context and related types
 */

export interface StrapiLogger {
    debug: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
}

export interface StrapiInstance {
    log: StrapiLogger;
    db?: any;
    server?: {
        httpServer?: any;
    };
    documents?: {
        use: (middleware: DocumentServiceMiddleware) => void;
    };
    plugin?: (name: string) => any;
}

export interface DocumentServiceContext {
    action: string;
    params: {
        strapi?: StrapiInstance;
        locale?: string;
        data?: any;
        where?: any;
        documentId?: string;
        [key: string]: any;
    };
    contentType: {
        uid: string;
        modelName: string;
        [key: string]: any;
    };
    [key: string]: any;
}

export type DocumentServiceNext = () => Promise<any>;

export type DocumentServiceMiddleware = (
    context: DocumentServiceContext,
    next: DocumentServiceNext
) => Promise<any>;

export interface RichTextBlock {
    type: string;
    children?: RichTextBlock[];
    text?: string;
    [key: string]: any;
}

export interface FileReference {
    id?: string | number;
    documentId?: string;
    name?: string;
    url?: string;
    [key: string]: any;
}

export interface PodcastDocument {
    title?: string;
    file?: FileReference | FileReference[];
    duration?: number;
    wordCount?: number;
    content?: string | RichTextBlock[];
    [key: string]: any;
}

export interface ArticleDocument {
    title?: string;
    content?: string | RichTextBlock[];
    wordCount?: number;
    [key: string]: any;
}