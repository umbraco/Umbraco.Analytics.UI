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

/** The value as a finite number, or `undefined` for anything else (missing, text, NaN, Infinity). */
export function asNumber(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** The value as display text: strings and numbers as they are, anything else (missing, objects) as empty. */
export function asText(value: unknown): string {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "bigint"
        ? String(value)
        : "";
}
