import type { UauiDeltaUnit } from "../../delta-badge/delta-badge.element.js";
import { deltaScale } from "../delta/delta-scale.js";
import { getNumberFormat } from "./number-format.js";

/** A `value` of a `uaui-kpi-tile` or `uaui-stat`: a number the element formats, or a string shown as given. */
export type UauiFigureValue = number | string | null | undefined;

/** A `value` that is a finite number, else `undefined`. */
export function numericValue(value: UauiFigureValue): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Formats the `value` of a tile or stat. Built lazily and kept per language and options object, so a render with
 * nothing changed reuses the formatter without building the cache key. Internal: not exported from the package.
 */
export class UauiFigureFormatter {
    #cached?: { lang: string; valueFormat?: Intl.NumberFormatOptions; format: Intl.NumberFormat };

    /**
     * The text to show for `value`: a string exactly as given, a finite number formatted in `lang` with `valueFormat`.
     * An empty string, a number that isn't finite (NaN, Infinity), `undefined` or `null` is no value (`undefined`).
     */
    text(value: UauiFigureValue, lang: string, valueFormat: Intl.NumberFormatOptions | undefined): string | undefined {
        if (typeof value === "string") return value === "" ? undefined : value;
        const number = numericValue(value);
        return number === undefined ? undefined : this.#format(lang, valueFormat).format(number);
    }

    #format(lang: string, valueFormat: Intl.NumberFormatOptions | undefined): Intl.NumberFormat {
        if (!this.#cached || this.#cached.lang !== lang || this.#cached.valueFormat !== valueFormat) {
            this.#cached = { lang, valueFormat, format: getNumberFormat(lang, valueFormat) };
        }
        return this.#cached.format;
    }
}

/**
 * The two numbers a tile's or stat's badge compares. A set `current` is used as given, with `previous`, both in
 * percent units for points (62 means 62%). Without it, a number `value` is the current period, and `previous` is
 * then on the value's scale: with points and `valueFormat.style` `"percent"`, both are fractions (0.256 is 25.6%)
 * and are scaled by 100, as the table's compare badge does with a column's values.
 */
export function badgeFigures(
    value: UauiFigureValue,
    current: number | undefined,
    previous: number | undefined,
    unit: UauiDeltaUnit,
    valueFormat: Intl.NumberFormatOptions | undefined,
): { current?: number; previous?: number } {
    if (current !== undefined && current !== null) return { current, previous };
    const fromValue = numericValue(value);
    if (fromValue === undefined) return { current: undefined, previous };
    const scale = deltaScale(unit, valueFormat);
    return { current: fromValue * scale, previous: previous === undefined || previous === null ? previous : previous * scale };
}
