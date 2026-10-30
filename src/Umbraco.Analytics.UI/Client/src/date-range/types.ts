/** A chosen date range. `preset` names the preset it came from, when it did. */
export type UaxDateRange = {
    /** ISO date, e.g. "2026-05-25". */
    from: string;
    /** ISO date, e.g. "2026-06-23". */
    to: string;
    preset?: string;
};

/** A chosen comparison range. */
export type UaxCompare = {
    mode: "previous-period" | "previous-year" | "custom";
    /** ISO date. */
    from: string;
    /** ISO date. */
    to: string;
};

/**
 * A choice in the date range dialog's preset list. The built-in ids are `last-7-days`, `last-30-days`,
 * `last-month` and `last-year`: they get their dates and a translated label from the package. Any other id
 * needs its own `range` and `label`. `custom` is always offered last and has no dates of its own.
 */
export type UaxDatePreset = {
    id: string;
    /** Already translated text. Built-in ids fall back to the package's translation. */
    label?: string;
    /** Dates for this preset as of `today` (ISO), both inclusive. */
    range?: (today: string) => { from: string; to: string };
};

/** What the date range dialog is opened with. */
export type UaxDateRangeModalData = {
    presets: UaxDatePreset[];
    /** ISO date no field may be after. */
    maxDate: string;
    allowCompare: boolean;
};

/** The detail of the `change` event of `uax-date-range`: the range the editor saved, and the comparison when they turned it on. */
export type UaxDateRangeChangeDetail = {
    value: UaxDateRange;
    compare?: UaxCompare;
};

/** What the date range dialog hands back when the editor saves. */
export type UaxDateRangeModalValue = {
    value: UaxDateRange;
    compare?: UaxCompare;
};
