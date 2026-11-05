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
        groupByHour: "Hour",
        groupByDay: "Day",
        groupByWeek: "Week",
        groupByMonth: "Month",

        // Chart
        chartAriaLabel: "Chart",
        chartLegendLabel: "Legend",
        chartTableCaption: "Chart data",
        chartTableDateHeader: "Date",
        // The category chart's hidden table: the heading of its column of categories (hours of the day, devices).
        chartTableCategoryHeader: "Category",
        // The category chart's empty state description when the product sets none (not date-flavoured, unlike emptyDescription).
        chartCategoryEmptyDescription: "There is nothing to show yet.",
        chartTableCompareHeader: "{0} (compare)",
        chartTotalLabel: "Total",
        chartMarkerAriaLabel: "Marker: {0}",
        // One marker inside that label, "Newsletter sent (May 29, 2026)", and what goes between several of them.
        chartMarkerEntry: "{0} ({1})",
        chartMarkerSeparator: "; ",
        chartMarkersMore: "+{0} more",
        chartComparisonLabel: "Comparison",
        // Drawn over the chart's today line.
        chartToday: "Today",
        // Drawn over the chart's now line when the chart is by hour.
        chartNow: "Now",
        // The hour that is now in the tooltip and the hidden table, "Nov 5, 2026, 2 PM (now)".
        chartNowDate: "{0} (now)",
        // The hour that is both now and incomplete, "Nov 5, 2026, 2 PM (now, incomplete)".
        chartNowIncompleteDate: "{0} (now, incomplete)",
        // Today's date in the tooltip and the hidden table, "Nov 2, 2026 (today)".
        chartTodayDate: "{0} (today)",
        // The same for a week or month that contains today, "Nov 2, 2026 (includes today)".
        chartTodayInBucket: "{0} (includes today)",
        // A date the chart marks incomplete (`incomplete-from`), "Nov 4, 2026 (incomplete)", in the tooltip and the hidden table.
        chartIncompleteDate: "{0} (incomplete)",
        // A date that is both today and incomplete, "Nov 4, 2026 (today, incomplete)".
        chartTodayIncompleteDate: "{0} (today, incomplete)",
        // The same for a week or month that contains today, "Nov 2, 2026 (includes today, incomplete)".
        chartTodayIncompleteInBucket: "{0} (includes today, incomplete)",
        // The hidden table's caption when the chart's y-axis is logarithmic.
        chartTableCaptionLog: "Chart data (logarithmic scale)",
        // The hidden table's caption in the share view (stack="percent"), where each cell is chartShareValue.
        chartTableCaptionShare: "Chart data (each value with its share of the date's total)",
        // A share with its value in the share view's hidden table: {0} the share ("42.5%"), {1} the value ("1,234").
        chartShareValue: "{0} ({1})",
        // The tooltip's last line when it lists only the largest rows: {0} how many more series have a value there.
        chartTooltipMore: "+{0} more",
        // The legend's button that shows the rest of a long legend: {0} how many series it hides. Its text is its name.
        chartLegendMore: "Show {0} more",
        // The same button once the legend shows every series: folds it back.
        chartLegendFewer: "Show fewer",

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
        dateRangeToday: "Today",
        dateRangeYesterday: "Yesterday",
        dateRangeLast7Days: "Last 7 days",
        dateRangeLast30Days: "Last 30 days",
        dateRangeThisMonth: "This month",
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
        // The progress cell: {0} is the completed count and {1} the total, both formatted, "2 of 3".
        tableProgress: "{0} of {1}",
    },
} satisfies UmbLocalizationDictionary;
