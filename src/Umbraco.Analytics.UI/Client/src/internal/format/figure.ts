import type { UauiDeltaUnit } from "../../delta-badge/delta-badge.element.js";
import { deltaScale } from "../delta/delta-scale.js";
import { getNumberFormat } from "./number-format.js";

/** A `value` of a `uaui-kpi-tile` or `uaui-stat`: a number the element formats, or a string shown as given. */
export type UauiFigureValue = number | string | null | undefined;

/** A `value` that is a finite number, else `undefined`. */
export function numericValue(value: UauiFigureValue): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** The size from which a number `value` is shown compact, unless the product sets `notation`. */
const COMPACT_FROM = 1_000_000;

/** How many significant digits a compact figure shows: "1.23M", "12.3M", "123M". */
const COMPACT_DIGITS = 3;

/** What a tile or stat shows for a `value`: the `text`, and the `exact` amount when `text` is a compact form of it. */
export interface UauiFigureText {
    text: string;
    exact?: string;
}

// Options that choose the number of digits. A compact figure sets its own, so a product's `maximumFractionDigits: 2`
// (meant for "4,837.40") doesn't change how many digits "1.23M" has, and Intl isn't handed fraction and significant
// digits that disagree (or a rounding increment, which it rejects with significant digits).
const DIGIT_OPTIONS = ["minimumFractionDigits", "maximumFractionDigits", "minimumSignificantDigits", "maximumSignificantDigits", "roundingPriority", "roundingIncrement"] as const;

function compactOptions(valueFormat: Intl.NumberFormatOptions | undefined): Intl.NumberFormatOptions {
    const options: Record<string, unknown> = { ...valueFormat };
    for (const key of DIGIT_OPTIONS) delete options[key];
    return { ...options, notation: "compact", maximumSignificantDigits: COMPACT_DIGITS };
}

/**
 * Formats the `value` of a tile or stat. Built lazily and kept per language and options object, so a render with
 * nothing changed reuses the formatter without building the cache key. Internal: not exported from the package.
 */
export class UauiFigureFormatter {
    #cached?: { lang: string; valueFormat?: Intl.NumberFormatOptions; format: Intl.NumberFormat; compact: Intl.NumberFormat };

    /**
     * What to show for `value`: a string exactly as given, a finite number formatted in `lang` with `valueFormat`.
     * An empty string, a number that isn't finite (NaN, Infinity), `undefined` or `null` is no value (`undefined`).
     *
     * A number of 1,000,000 or more (by size: -1,200,000 too) is shown compact ("€1.23M") when `valueFormat` doesn't
     * set `notation`; `exact` is then the full amount, formatted with `valueFormat`. `notation: "standard"` keeps the
     * exact amount, and any other `notation` is the product's choice.
     * With `options.compact` the number is shown compact at any size (a second line follows the value's shortening),
     * still unless `valueFormat` sets `notation`. `exact` is set only when the compact text differs from it. The compact form uses up to 3 significant digits
     * and ignores the product's digit options. The size is the number itself, not its rounded text, so 999,999.6 stays exact.
     */
    figure(value: UauiFigureValue, lang: string, valueFormat: Intl.NumberFormatOptions | undefined, options?: { compact?: boolean }): UauiFigureText | undefined {
        if (typeof value === "string") return value === "" ? undefined : { text: value };
        const number = numericValue(value);
        if (number === undefined) return undefined;
        const { format, compact } = this.#formats(lang, valueFormat);
        const exact = format.format(number);
        if (valueFormat?.notation !== undefined || (options?.compact !== true && Math.abs(number) < COMPACT_FROM)) return { text: exact };
        const text = compact.format(number);
        // Equal after an Intl fallback (a bad currency): nothing to add.
        return text === exact ? { text } : { text, exact };
    }

    #formats(lang: string, valueFormat: Intl.NumberFormatOptions | undefined) {
        if (!this.#cached || this.#cached.lang !== lang || this.#cached.valueFormat !== valueFormat) {
            this.#cached = {
                lang,
                valueFormat,
                format: getNumberFormat(lang, valueFormat),
                compact: getNumberFormat(lang, compactOptions(valueFormat)),
            };
        }
        return this.#cached;
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
