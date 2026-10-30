import type { UmbLocalizationDictionary } from "@umbraco-cms/backoffice/localization-api";

// Loaded by the package's `localization` extension as lang/en.js. The section name is the
// key prefix: `emptyHeadline` below is `uanAnalytics_emptyHeadline`. Placeholders are {0}, {1}...
// Generic verbs reuse Umbraco's keys instead of copies: Save is `buttons_save`, Close is
// `general_close`, Loading is `general_loading`, Search (label and placeholder) is `general_search`.
export default {
    uanAnalytics: {
        // Empty state
        emptyHeadline: "No data yet",
        emptyDescription: "Try a wider date range.",

        // KPI tile
        kpiTileAriaLabel: "{0}: {1}",
        kpiTileChangeAriaLabel: "{0}: {1}, change {2}",

        // Delta badge
        deltaUp: "Up {0}",
        deltaDown: "Down {0}",
        deltaFlat: "No change",

        // Group by
        groupByLabel: "Group by",
        groupByDay: "Day",
        groupByWeek: "Week",
        groupByMonth: "Month",

        // Chart
        chartAriaLabel: "Chart",
        chartLegendLabel: "Legend",
        chartTableCaption: "Chart data",
        chartTableDateHeader: "Date",
        chartMarkerAriaLabel: "Marker: {0}",
        chartMarkersLabel: "Markers",
        chartComparisonLabel: "Comparison",

        // Date range
        dateRangeButtonLabel: "Choose date range",
        dateRangeRange: "{0} to {1}",
        dateRangeCompareTo: "Compare to:",
        dateRangeModalHeadline: "Date range",
        dateRangePreset: "Preset",
        dateRangeLast7Days: "Last 7 days",
        dateRangeLast30Days: "Last 30 days",
        dateRangeLastMonth: "Last month",
        dateRangeLastYear: "Last year",
        dateRangeCustom: "Custom",
        dateRangeFrom: "From",
        dateRangeTo: "To",
        dateRangeCompare: "Compare",
        dateRangeCompareMode: "Compare mode",
        dateRangeComparePreviousPeriod: "Previous period",
        dateRangeComparePreviousYear: "Previous year",
        dateRangeCompareCustom: "Custom",
        dateRangeCompareStart: "Compare from",
        dateRangeCompareEnd: "Compare until",
        dateRangeErrorEndBeforeStart: "The end date must be on or after the start date.",
        dateRangeErrorAfterMaxDate: "The date can't be after {0}.",

        // Data table
        tableShowRows: "Show rows",
        tablePagerPosition: "{0}–{1} of {2}",
        tablePreviousPage: "Previous page",
        tableNextPage: "Next page",
        tableSortAscending: "Sorted ascending",
        tableSortDescending: "Sorted descending",
        tableSortBy: "Sort by {0}",
    },
} satisfies UmbLocalizationDictionary;
