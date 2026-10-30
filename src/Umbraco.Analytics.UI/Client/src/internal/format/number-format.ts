const MAX_CACHED = 100;
const cache = new Map<string, Intl.NumberFormat>();

/**
 * An `Intl.NumberFormat` for a language and options, built once and reused. `localize.number` builds a
 * new formatter on every call, which is too slow for a table of hundreds of cells, and the same few
 * (language, options) pairs repeat across every table on a page.
 */
export function getNumberFormat(lang: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
    const key = `${lang}|${options ? JSON.stringify(options) : ""}`;
    let format = cache.get(key);
    if (!format) {
        // A product that builds fresh options all the time would otherwise grow the cache without bound.
        if (cache.size >= MAX_CACHED) cache.clear();
        format = new Intl.NumberFormat(lang, options);
        cache.set(key, format);
    }
    return format;
}
