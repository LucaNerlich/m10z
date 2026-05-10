/**
 * Configuration for the ReactMarkdown plugin pipeline used by the Markdown
 * component.
 *
 * Kept separate from the component itself so the sanitisation allowlist (the
 * security-relevant surface) and the plugin order are easy to audit in one
 * place.
 */

import type {Options as RehypeExternalLinksOptions} from 'rehype-external-links';
import {defaultSchema} from 'rehype-sanitize';

export const REMARK_REHYPE_OPTIONS = {
    // Disable the default `user-content-` clobber prefix on footnote IDs so
    // anchor links like `#fn-1` keep working. Our content comes from trusted
    // CMS authors, so the DOM-clobbering protection isn't load-bearing here.
    clobberPrefix: '',
    footnoteLabel: 'Fußnoten',
} as const;

export const REHYPE_EXTERNAL_LINKS_OPTIONS: RehypeExternalLinksOptions = {
    target: '_blank',
    rel: ['noopener', 'noreferrer'],
};

/**
 * rehype-sanitize schema. Extends the default with the custom inline tags
 * produced by the preprocessor (`mark`, `ins`, `sup`, `sub`) and a `section`
 * tag for footnote groups. Allows `data-*` attributes on anchors so Fancybox
 * and analytics hooks can attach.
 */
export const REHYPE_SANITIZE_SCHEMA = {
    ...defaultSchema,
    clobberPrefix: '',
    tagNames: [...(defaultSchema.tagNames || []), 'ins', 'sup', 'sub', 'mark', 'section'],
    attributes: {
        ...defaultSchema.attributes,
        ins: [],
        sup: [],
        sub: [],
        mark: [],
        section: ['class'],
        a: [
            ...(defaultSchema.attributes?.a || []),
            'id',
            ['data*', /^data-/],
        ],
        li: [
            ...(defaultSchema.attributes?.li || []),
            'id',
        ],
    },
} as const;
