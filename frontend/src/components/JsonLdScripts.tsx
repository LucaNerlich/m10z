import Script from 'next/script';

import {stringifyJsonLd} from '@/src/lib/jsonld/helpers';
import {type JsonLd} from '@/src/lib/jsonld/types';

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
 * Serializes each object through `stringifyJsonLd`, which escapes `<` so a
 * payload containing `</script>` cannot break out of the tag.
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
                        __html: stringifyJsonLd(jsonLd),
                    }}
                />
            ))}
        </>
    );
}
