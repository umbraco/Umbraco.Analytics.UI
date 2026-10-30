import type { UmbLocalizationController } from "@umbraco-cms/backoffice/localization-api";

/**
 * A date range as text in the user's culture, such as "25 May 2026 – 23 Jun 2026". The ISO dates are read and
 * written as UTC, so the text is the same in every time zone.
 */
export function formatRange(localize: Pick<UmbLocalizationController, "date">, { from, to }: { from: string; to: string }): string {
    const format = (iso: string) => localize.date(new Date(`${iso}T00:00:00Z`), { dateStyle: "medium", timeZone: "UTC" });
    return `${format(from)} – ${format(to)}`;
}
