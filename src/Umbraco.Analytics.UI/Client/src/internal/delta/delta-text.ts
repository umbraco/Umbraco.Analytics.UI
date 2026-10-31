import type { UmbLocalizationController } from "@umbraco-cms/backoffice/localization-api";
import type { UauiDeltaUnit } from "../../delta-badge/delta-badge.element.js";

/** Whether a change is good, bad or neither. */
export type UauiDeltaSentiment = "positive" | "negative" | "neutral";

/** A change rounded to the decimals it is shown with, so a change that shows as 0 counts as 0. */
export function roundDelta(value: number, maxDecimals: number): number {
    const factor = 10 ** maxDecimals;
    return Math.round(value * factor) / factor;
}

/** The direction of a rounded change: "flat" when it is 0. */
export function deltaDirection(rounded: number): "up" | "down" | "flat" {
    return rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
}

/** Whether a rounded change is good, after `lowerIsBetter`. */
export function deltaSentiment(rounded: number, lowerIsBetter: boolean): UauiDeltaSentiment {
    const direction = deltaDirection(rounded);
    if (direction === "flat") return "neutral";
    return (direction === "up") !== lowerIsBetter ? "positive" : "negative";
}

/**
 * A change as the delta badge writes it: signed, in the user's culture, "+12.4%" or "+12.4 pp".
 * Shared by the badge and any element that words the same change for screen readers. Internal: not exported.
 */
export function formatDelta(localize: UmbLocalizationController, value: number, unit: UauiDeltaUnit, maxDecimals: number): string {
    const rounded = roundDelta(value, maxDecimals);
    const options = { maximumFractionDigits: maxDecimals, signDisplay: "exceptZero" } as const;
    // Percent style lets the culture place the sign and spacing ("+12.4%" in en, "+12,4 %" in da-DK).
    return unit === "points"
        ? localize.term("uauiAnalytics_deltaPercentagePoints", localize.number(rounded, options))
        : localize.number(rounded / 100, { ...options, style: "percent" });
}

/** The word for a sentiment: "improvement", "decline" or "no change". */
export function deltaSentimentWord(localize: UmbLocalizationController, sentiment: UauiDeltaSentiment): string {
    const key = {
        positive: "uauiAnalytics_deltaImprovement",
        negative: "uauiAnalytics_deltaDecline",
        neutral: "uauiAnalytics_deltaNoChange",
    }[sentiment];
    return localize.term(key);
}
