import {stringifyJsonLd} from '@/src/lib/jsonld/helpers';
import {type JsonLd} from '@/src/lib/jsonld/types';

type JsonLdScriptEntry = {
    /** Unique script element id (e.g. `jsonld-article-${slug}`). */
    id: string;
    jsonLd: JsonLd;
};

type JsonLdScriptsProps = {
    entries: JsonLdScriptEntry[];
};

/**
 * Renders one or more JSON-LD `<script type="application/ld+json">` tags.
 *
 * A native `<script>` is used deliberately: `next/script` renders `null` during
 * SSR for its default strategy and injects the element client-side, which would
 * keep structured data out of the served HTML that crawlers and validators read.
 *
 * Serializes each object through `stringifyJsonLd`, which escapes `<` so a
 * payload containing `</script>` cannot break out of the tag.
 */
export function JsonLdScripts({entries}: JsonLdScriptsProps) {
    return (
        <>
            {entries.map(({id, jsonLd}) => (
                <script
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
