const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

/**
 * The URL when it is safe to put in an anchor, else `undefined`. Rows come from the product's data,
 * which for analytics includes URLs a visitor's browser reported, so `javascript:` and similar
 * schemes must never become a link. Relative URLs are fine.
 */
export function safeHref(value: unknown): string | undefined {
    if (typeof value !== "string" || value.trim() === "") return undefined;
    if (!URL.canParse(value, document.baseURI)) return undefined;
    return SAFE_PROTOCOLS.has(new URL(value, document.baseURI).protocol) ? value : undefined;
}
