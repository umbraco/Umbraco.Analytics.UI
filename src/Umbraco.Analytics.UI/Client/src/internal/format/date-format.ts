const MAX_CACHED = 100;
const cache = new Map<string, Intl.DateTimeFormat>();

/**
 * An `Intl.DateTimeFormat` for a language and options, built once and reused, as `getNumberFormat` does for numbers.
 * It always formats in UTC: pass it a `Date` made with `Date.UTC` from a calendar day, so neither the browser's nor a
 * `timeZone` option's offset can move the day. With a `fallback`, options that `Intl` rejects use the fallback instead
 * of throwing.
 */
export function getUtcDateFormat(lang: string, options?: Intl.DateTimeFormatOptions, fallback?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    const key = `${lang}|${options ? JSON.stringify(options) : ""}|${fallback ? JSON.stringify(fallback) : ""}`;
    let format = cache.get(key);
    if (!format) {
        // A product that builds fresh options all the time would otherwise grow the cache without bound.
        if (cache.size >= MAX_CACHED) cache.clear();
        try {
            format = new Intl.DateTimeFormat(lang, { ...options, timeZone: "UTC" });
        } catch (error) {
            // Options Intl rejects (e.g. `dateStyle` with `hour`) use the fallback, cached under the bad options so
            // they aren't tried again on every render.
            if (!fallback) throw error;
            format = new Intl.DateTimeFormat(lang, { ...fallback, timeZone: "UTC" });
        }
        cache.set(key, format);
    }
    return format;
}
