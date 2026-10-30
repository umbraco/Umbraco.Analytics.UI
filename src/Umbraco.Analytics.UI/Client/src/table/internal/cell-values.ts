// Coercion of the unknown cell values a product's rows hold.

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
