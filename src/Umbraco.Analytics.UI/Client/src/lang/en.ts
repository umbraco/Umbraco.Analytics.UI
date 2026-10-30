import type { UmbLocalizationDictionary } from "@umbraco-cms/backoffice/localization-api";

// Loaded by the package's `localization` extension as lang/en.js. The section name is the
// key prefix: `emptyHeadline` below is `uaxAnalytics_emptyHeadline`. Placeholders are {0}, {1}...
// Generic verbs reuse Umbraco's keys instead of copies: Save is `buttons_save`, Close is
// `general_close`, Loading is `general_loading`, Search (label and placeholder) is `general_search`.
export default {
    uaxAnalytics: {
        // Empty state
        emptyHeadline: "No data yet",
        emptyDescription: "Try a wider date range.",


        // Delta badge
        deltaPercentagePoints: "{0} pp",
        deltaImprovement: "improvement",
        deltaDecline: "decline",
        deltaNoChange: "no change",

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
        chartTableCompareHeader: "{0} (compare)",
        chartTotalLabel: "Total",
        chartMarkerAriaLabel: "Marker: {0}",
        chartMarkersMore: "+{0} more",
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
        tablePagination: "Pagination",
        tablePagerPosition: "{0}–{1} of {2}",
        tablePreviousPage: "Previous page",
        tableNextPage: "Next page",
        tableSortAscending: "Sorted ascending",
        tableSortDescending: "Sorted descending",
        tableSortBy: "Sort by {0}",
    },
} satisfies UmbLocalizationDictionary;
