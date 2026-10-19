import {describe, expect, test, vi} from 'vitest';

import multipartGuard, {hasMultipartContentType, isMultipartUploadPath} from './multipartGuard';
import middlewares from '../../config/middlewares';

describe('isMultipartUploadPath', () => {
    test('accepts the content-API and admin upload endpoints', () => {
        expect(isMultipartUploadPath('/api/upload')).toBe(true);
        expect(isMultipartUploadPath('/api/upload/')).toBe(true);
        expect(isMultipartUploadPath('/upload')).toBe(true);
        expect(isMultipartUploadPath('/upload/')).toBe(true);
        expect(isMultipartUploadPath('/upload/files')).toBe(true);
        expect(isMultipartUploadPath('/upload/files/12')).toBe(true);
        expect(isMultipartUploadPath('/upload/files/12/replace')).toBe(true);
        expect(isMultipartUploadPath('/admin/project-settings')).toBe(true);
    });

    test('rejects every other path, including nested lookalikes', () => {
        expect(isMultipartUploadPath('/api/articles')).toBe(false);
        expect(isMultipartUploadPath('/api/articles/upload')).toBe(false);
        expect(isMultipartUploadPath('/api/upload/files')).toBe(false);
        expect(isMultipartUploadPath('/upload/anything')).toBe(false);
        expect(isMultipartUploadPath('/upload/filesx')).toBe(false);
        expect(isMultipartUploadPath('/')).toBe(false);
    });

    test('is registered before the body parser', () => {
        const names = middlewares.map((entry) =>
            typeof entry === 'string' ? entry : entry.name,
        );
        expect(names).toContain('global::multipartGuard');
        expect(names).toContain('strapi::body');
        expect(names.indexOf('global::multipartGuard')).toBeLessThan(
            names.indexOf('strapi::body'),
        );
    });

    test('honours a custom API prefix', () => {
        expect(isMultipartUploadPath('/cms/upload', '/cms')).toBe(true);
        expect(isMultipartUploadPath('/api/upload', '/cms')).toBe(false);
    });
});

describe('hasMultipartContentType', () => {
    test('matches with or without a boundary and in any case', () => {
        expect(hasMultipartContentType('multipart/form-data; boundary=abc')).toBe(true);
        expect(hasMultipartContentType('Multipart/Form-Data')).toBe(true);
        expect(hasMultipartContentType(['multipart/form-data'])).toBe(true);
        expect(hasMultipartContentType('application/json')).toBe(false);
        expect(hasMultipartContentType(undefined)).toBe(false);
    });
});

describe('multipartGuard middleware', () => {
    function makeCtx(path: string, contentType?: string) {
        return {
            path,
            request: {headers: contentType ? {'content-type': contentType} : {}},
        };
    }

    test('rejects multipart before the body parser on a public route', async () => {
        const next = vi.fn(async () => 'parsed');
        const ctx = makeCtx('/api/articles', 'multipart/form-data; boundary=abc');

        await multipartGuard()(ctx, next);

        expect(next).not.toHaveBeenCalled();
        expect(ctx.status).toBe(413);
    });

    test('lets multipart through to the upload endpoint', async () => {
        const next = vi.fn(async () => 'parsed');
        const ctx = makeCtx('/api/upload', 'multipart/form-data; boundary=abc');

        await multipartGuard()(ctx, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(ctx.status).toBeUndefined();
    });

    test('leaves non-multipart bodies alone', async () => {
        const next = vi.fn(async () => 'parsed');
        const ctx = makeCtx('/api/articles', 'application/json');

        await multipartGuard()(ctx, next);

        expect(next).toHaveBeenCalledTimes(1);
    });
});
