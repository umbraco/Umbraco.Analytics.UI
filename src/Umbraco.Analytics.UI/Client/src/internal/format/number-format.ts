const MAX_CACHED = 100;
const cache = new Map<string, Intl.NumberFormat>();

/**
 * An `Intl.NumberFormat` for a language and options, built once and reused. `localize.number` builds a
 * new formatter on every call, which is too slow for a table of hundreds of cells, and the same few
 * (language, options) pairs repeat across every table on a page. Options that `Intl` rejects (e.g. a bad
 * currency code) fall back to the language's default format instead of throwing, so one bad `valueFormat`
 * never breaks a component.
 */
export function getNumberFormat(lang: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
    const key = `${lang}|${options ? JSON.stringify(options) : ""}`;
    let format = cache.get(key);
    if (!format) {
        // A product that builds fresh options all the time would otherwise grow the cache without bound.
        if (cache.size >= MAX_CACHED) cache.clear();
        try {
            format = new Intl.NumberFormat(lang, options);
        } catch (error) {
            // Only the options can be at fault here: a bad language would throw below too, as it did before.
            if (!options) throw error;
            // Cached under the bad options, so they aren't tried again on every render.
            format = new Intl.NumberFormat(lang);
        }
        cache.set(key, format);
    }
    return format;
}

