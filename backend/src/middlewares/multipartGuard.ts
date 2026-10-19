/**
 * Pre-body multipart guard.
 *
 * `strapi::body` parses multipart bodies on every path before routing and auth
 * run, with a global `formidable.maxFileSize` sized for podcast uploads. That
 * makes the upload allowance remotely reachable on every public route, and a
 * request rejected later by auth/routing can leave its temp file behind.
 *
 * This middleware runs *before* `strapi::body` and rejects multipart requests
 * that target anything but the upload endpoint, before any byte is buffered.
 * JSON and urlencoded bodies are untouched.
 */

type MultipartGuardContext = {
    path: string;
    request: {headers: Record<string, string | string[] | undefined>};
    status?: number;
    body?: unknown;
};

/**
 * Paths allowed to carry a multipart body. The content-API upload endpoint is
 * `${apiPrefix}/upload`; the admin Media Library uses `/upload/files` (create),
 * `/upload/files/:id` (metadata updates) and `/upload/files/:id/replace`, and
 * the admin project settings accept the logo upload. Everything else is
 * rejected before the body parser.
 */
export function isMultipartUploadPath(path: string, apiPrefix = '/api'): boolean {
    const normalized = path.replace(/\/+$/, '');
    return (
        normalized === '/upload' ||
        normalized === `${apiPrefix}/upload` ||
        normalized === '/upload/files' ||
        /^\/upload\/files\/[^/]+$/.test(normalized) ||
        /^\/upload\/files\/[^/]+\/replace$/.test(normalized) ||
        normalized === '/admin/project-settings'
    );
}

export function hasMultipartContentType(contentType: string | string[] | undefined): boolean {
    const value = Array.isArray(contentType) ? contentType[0] : contentType;
    return typeof value === 'string' && value.toLowerCase().includes('multipart/form-data');
}

export default function multipartGuard() {
    return async (ctx: MultipartGuardContext, next: () => Promise<unknown>): Promise<unknown> => {
        if (
            hasMultipartContentType(ctx.request.headers?.['content-type']) &&
            !isMultipartUploadPath(ctx.path)
        ) {
            ctx.status = 413;
            ctx.body = {
                error: {
                    status: 413,
                    name: 'PayloadTooLargeError',
                    message: 'Multipart uploads are only accepted on the upload endpoint.',
                },
            };
            return;
        }
        return next();
    };
}
