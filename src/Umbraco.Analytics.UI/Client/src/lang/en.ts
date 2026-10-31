import type { UmbLocalizationDictionary } from "@umbraco-cms/backoffice/localization-api";

// Loaded by the package's `localization` extension as lang/en.js. The section name is the
// key prefix: `emptyHeadline` below is `uauiAnalytics_emptyHeadline`. Placeholders are {0}, {1}...
// Generic verbs reuse Umbraco's keys instead of copies: Save is `buttons_save`, Close is
// `general_close`, Loading is `general_loading`, Search (label and placeholder) is `general_search`.
export default {
    uauiAnalytics: {
        // Empty state
        emptyHeadline: "No data yet",
        emptyDescription: "Try a wider date range.",

        // Error state (Retry is Umbraco's `general_retry`)
        errorHeadline: "Something went wrong",
        errorDescription: "The data could not be loaded.",

        // KPI tile (an error uses errorHeadline above)
        kpiNoData: "No data for this period",

        // Delta badge
        deltaPercentagePoints: "{0} pp",
        deltaImprovement: "improvement",
        deltaDecline: "decline",
        deltaNoChange: "no change",
        // Screen-reader text after the number, "+12.4%, improvement". {0} is one of the three words above.
        deltaSentimentSuffix: ", {0}",

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
        // One marker inside that label, "Newsletter sent (May 29, 2026)", and what goes between several of them.
        chartMarkerEntry: "{0} ({1})",
        chartMarkerSeparator: "; ",
        chartMarkersMore: "+{0} more",
        chartComparisonLabel: "Comparison",

        // Funnel
        funnelAriaLabel: "Funnel",
        // Names this period in the legend and tooltip when the product gives no label.
        funnelCurrentLabel: "This period",
        // A step's accessible name: {0} the step, {1} its value.
        funnelStepName: "{0}: {1}",
        // A tooltip line: the step's share of the first step, {0} the first step's label ("Of Visitors").
        funnelTooltipOfFirst: "Of {0}",
        funnelFromPrevious: "From previous step",
        funnelTableCaption: "Funnel data",
        funnelTableStepHeader: "Step",
        funnelTableValueHeader: "Value",
        funnelTableOfFirstHeader: "Of first step",
        // How many reached the previous step but not this one.
        funnelTableDroppedOffHeader: "Dropped off",
        // A hidden table cell with no figure, where the funnel shows a dash (the step before it is 0, or has no compare value).
        funnelNoValue: "No value",
        // A focused step's description for screen readers: the tooltip's facts as lines joined by funnelDescriptionSeparator.
        // A period's value: {0} the period's name, {1} the value ("This period: 532").
        funnelDescriptionValue: "{0}: {1}",
        // The compare value with its % change: {0} the period's name, {1} the value, {2} the change ("+6.8%"),
        // {3} improvement, decline or no change (the delta badge's words).
        funnelDescriptionCompare: "{0}: {1}, {2}, {3}",
        // The share of the first step: {0} the first step's label, {1} the share ("Of Carts created: 42.9%").
        funnelDescriptionOfFirst: "Of {0}: {1}",
        // The share from the previous step: {0} the share, or funnelNoValue.
        funnelDescriptionFromPrevious: "From previous step: {0}",
        funnelDescriptionSeparator: ". ",

        // Date range
        // The button's accessible name is its purpose, then the lines it shows ({0} purpose, {1} range, {2} comparison).
        dateRangeButtonLabel: "Choose date range",
        dateRangeButtonName: "{0}. {1}",
        dateRangeButtonNameCompare: "{0}. {1}. {2}",
        dateRangeRange: "{0} to {1}",
        dateRangeCompareShort: "vs {0}",
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

        // Compact pager (used by the data table; override these keys to reword it)
        pagerPageSize: "Per page",
        pagerLabel: "Pagination",
        // The pager's name when its table has a `label`: {0} is that label, "Top pages, pagination".
        pagerLabelNamed: "{0}, pagination",
        pagerPosition: "{0}–{1} of {2}",
        pagerPreviousPage: "Previous page",
        pagerNextPage: "Next page",

        // Data table
        // Names the scrolling table area, only while its columns don't fit.
        tableScrollRegion: "Table, scroll sideways to see more columns",
        // The same when the table has a `label`: {0} is that label, "Top pages, scroll sideways to see more columns".
        tableScrollRegionNamed: "{0}, scroll sideways to see more columns",
    },
} satisfies UmbLocalizationDictionary;
