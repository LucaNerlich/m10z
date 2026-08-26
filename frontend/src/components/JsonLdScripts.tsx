import Script from 'next/script';

import {type JsonLd} from '@/src/lib/jsonld/types';

// Hoist RegExp pattern to module scope
const LT_ESCAPE_PATTERN = /</g;

type JsonLdScriptEntry = {
    /** Unique Script element id (e.g. `jsonld-article-${slug}`). */
    id: string;
    jsonLd: JsonLd;
};

type JsonLdScriptsProps = {
    entries: JsonLdScriptEntry[];
};

/**
 * Renders one or more JSON-LD `<script type="application/ld+json">` tags.
 *
 * Serializes each object with `<` escaped to `\u003c` so a payload containing
 * `</script>` cannot break out of the tag.
 */
export function JsonLdScripts({entries}: JsonLdScriptsProps) {
    return (
        <>
            {entries.map(({id, jsonLd}) => (
                <Script
                    key={id}
                    id={id}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(jsonLd).replace(LT_ESCAPE_PATTERN, '\\u003c'),
                    }}
                />
            ))}
        </>
    );
}
