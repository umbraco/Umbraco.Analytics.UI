# Stories: Analytics UI v1

**19 stories, 93 criteria.** Story ids are used by `PLAN.md` and the spec files, so never renumber them.

> [!IMPORTANT]
> **3 guesses need your OK.**
> - The Definition of Ready and Done below are starting points, not agreed team rules.
> - "Product developer" is the role for anything a developer wires up, and "editor" for anything a person reads or clicks on screen.
> - Criteria with exact numbers (300ms search delay, page sizes 10/25/50/100, about 5 y-axis ticks) come from SPEC.md. Change them there first if they're wrong.

**Foundation**

- [FND-1](#fnd-1-theme-tokens-products-can-override) Theme tokens products can override, 3 criteria
- [FND-2](#fnd-2-built-in-text-is-translated) Built-in text is translated, 3 criteria
- [FND-3](#fnd-3-empty-and-loading-states) Empty and loading states, 6 criteria

**Small elements**

- [BDG-1](#bdg-1-change-badge-matches-the-design) Change badge matches the design, 6 criteria
- [KPI-1](#kpi-1-kpi-tile-shows-a-headline-number) KPI tile shows a headline number, 7 criteria
- [KPI-2](#kpi-2-kpi-tiles-switch-the-charts-metric) KPI tiles switch the chart's metric, 4 criteria
- [GRP-1](#grp-1-day--week--month-switch) Day / Week / Month switch, 4 criteria

**Time-series chart**

- [CHT-1](#cht-1-line-and-area-chart) Line and area chart, 7 criteria
- [CHT-2](#cht-2-compare-with-another-period) Compare with another period, 5 criteria
- [CHT-3](#cht-3-bar-and-stacked-bar-chart) Bar and stacked bar chart, 4 criteria
- [CHT-4](#cht-4-event-markers) Event markers, 5 criteria

**Date range**

- [DR-1](#dr-1-pick-a-date-range) Pick a date range, 8 criteria
- [DR-2](#dr-2-pick-a-comparison-range) Pick a comparison range, 5 criteria

**Data table**

- [TBL-1](#tbl-1-table-cells-by-column-type) Table cells by column type, 7 criteria
- [TBL-2](#tbl-2-sort-by-a-column) Sort by a column, 4 criteria
- [TBL-3](#tbl-3-page-through-rows) Page through rows, 5 criteria
- [TBL-4](#tbl-4-search-rows) Search rows, 3 criteria
- [TBL-5](#tbl-5-open-a-row) Open a row, 3 criteria

**Integration**

- [INT-1](#int-1-one-copy-on-a-site-ready-to-use) One copy on a site, ready to use, 4 criteria

Not a story: the `uui-box` pane recipe (SPEC.md §1) is a Storybook story with no behaviour of its own. `PLAN.md` carries it as a docs task.

<details>
<summary>Ready and Done</summary>

**Ready:** the role, capability and value are all stated. Given/When/Then criteria cover the happy path. Out of scope is explicit. It passes INVEST.

**Done:**
- Every criterion passes as an executable spec, sad paths included.
- The element has Storybook stories for each state, and passes axe in light and dark.
- It's exported from `src/index.ts`, and the `api/ui.api.md` change is committed.
- `npm run lint`, `npm test` and `npm run build` pass.

</details>

---

## FND-1: Theme tokens products can override

As a product developer,
I want the package's colours exposed as CSS custom properties,
so that my analytics screen can follow my product's palette without forking the elements.

```
AC1 — Default series colours
  Given an element from the package on a page with no overrides
  When  it renders
  Then  --uan-series-1 resolves to the value of --uui-palette-space-cadet

AC2 — Override from a parent
  Given a parent element that sets --uan-series-1 to a different colour
  When  an element from the package renders inside it
  Then  the element uses the parent's colour

AC3 — Tints follow the theme
  Given the dark theme is active
  When  a positive tint (--uan-tint-positive) is read
  Then  it is derived from --uui-color-positive, not a fixed colour
```

## FND-2: Built-in text is translated

As an editor,
I want every label in the analytics elements in my backoffice language,
so that the screen reads naturally next to the rest of Umbraco.

```
AC1 — Strings come from localization keys
  Given an element that shows built-in text such as "No data yet"
  When  it renders in a backoffice set to English
  Then  the text is the translation for its uanAnalytics_* key, not the raw key

AC2 — Product can override a string
  Given a product registers its own localization for uanAnalytics_emptyHeadline
  When  the empty state renders
  Then  it shows the product's text

Sad path

AC3 — Aria labels are translated too
  Given an element with an icon-only control
  When  it renders
  Then  the control's aria-label is a translated string, not a key or empty
```

## FND-3: Empty and loading states

As an editor,
I want to see when data is loading and when there is none,
so that I don't mistake an empty or half-loaded chart for real results.

```
AC1 — Empty state shows the product's text
  Given a uan-empty-state with headline "No pageviews yet"
  When  it renders
  Then  the headline reads "No pageviews yet"

AC2 — Default empty text
  Given a data element with no data and no empty-headline set
  When  it renders
  Then  it shows uan-empty-state with the "No data yet" translation

AC3 — Skeleton on first load
  Given a data element with loading set and no data yet
  When  it renders
  Then  it shows a skeleton

AC4 — Skeleton keeps the element's size
  Given a data element whose loaded height is known
  When  it switches from loading to loaded
  Then  its height does not change

AC5 — Reload keeps old data visible
  Given a data element showing data
  When  loading is set again
  Then  the old data stays visible

AC6 — Reload shows a loading bar
  Given a data element showing data
  When  loading is set again
  Then  a loading bar shows at its top edge
```

## BDG-1: Change badge matches the design

As an editor,
I want the change against the previous period shown as a coloured pill,
so that I can tell at a glance whether a number went the right way.

```
AC1 — Positive pill
  Given uan-delta-badge with value 12.4
  When  it renders
  Then  it shows "+12.4%" on a positive tint

AC2 — Negative pill
  Given uan-delta-badge with value -3
  When  it renders
  Then  it shows "-3%" on a danger tint

AC3 — Flat pill
  Given uan-delta-badge with value 0.02 and max-decimals 1
  When  it renders
  Then  it shows "0%" on a neutral tint

AC4 — Lower is better
  Given uan-delta-badge with value -1.2, unit "points" and lower-is-better
  When  it renders
  Then  it shows "-1.2 pp" on a positive tint

AC5 — Small size
  Given uan-delta-badge with size "sm"
  When  it renders
  Then  it uses the small font size and padding

AC6 — Culture-aware number
  Given the backoffice culture is da-DK
  When  uan-delta-badge renders value 12.4
  Then  it shows "+12,4%"
```

## KPI-1: KPI tile shows a headline number

As an editor,
I want key numbers shown as tiles at the top of an analytics screen,
so that I see the headline results before reading charts.

```
AC1 — Label
  Given uan-kpi-tile with label "Revenue"
  When  it renders
  Then  it shows "Revenue"

AC2 — Change badge
  Given uan-kpi-tile with delta 18.7
  When  it renders
  Then  it shows a uan-delta-badge with "+18.7%"

AC3 — No badge without a delta
  Given uan-kpi-tile with no delta
  When  it renders
  Then  no badge is shown

AC4 — Equal heights in a row
  Given three tiles in one row, one with a label that wraps to two lines
  When  they render
  Then  all three are the same height

AC5 — Badge wraps when narrow
  Given a tile too narrow to fit the value and the badge on one line
  When  it renders
  Then  the badge sits below the value

AC6 — Value shown as given
  Given uan-kpi-tile with value "€ 4,837.40"
  When  it renders
  Then  it shows "€ 4,837.40" exactly

AC7 — Icon
  Given uan-kpi-tile with icon "icon-coins"
  When  it renders
  Then  it shows that icon
```

## KPI-2: KPI tiles switch the chart's metric

As an editor,
I want to click a KPI tile to see its metric in the chart below,
so that I can explore each number without leaving the screen.

```
AC1 — Click raises select
  Given a uan-kpi-tile with selectable set
  When  the editor clicks it
  Then  it raises a select event

AC2 — Keyboard raises select
  Given a selectable tile with keyboard focus
  When  the editor presses Enter
  Then  it raises a select event

AC3 — Selected state
  Given a selectable tile with selected set
  When  it renders
  Then  it shows its active state and reports aria-pressed="true"

Sad path

AC4 — Not selectable by default
  Given a uan-kpi-tile without selectable
  When  the editor clicks it
  Then  no select event is raised
```

## GRP-1: Day / Week / Month switch

As an editor,
I want to switch a chart between daily, weekly and monthly points,
so that I can see short spikes or long trends.

```
AC1 — Shows the current value
  Given uan-group-by with value "week"
  When  it renders
  Then  "Week" is the checked option

AC2 — Click changes value
  Given uan-group-by with value "day"
  When  the editor clicks "Month"
  Then  it raises change with { value: "month" }

AC3 — Arrow keys change value
  Given uan-group-by with focus on "Day"
  When  the editor presses the right arrow key
  Then  it raises change with { value: "week" }

AC4 — Limited options
  Given uan-group-by with options ["day", "week"]
  When  it renders
  Then  only "Day" and "Week" are shown
```

## CHT-1: Line and area chart

As an editor,
I want to see a metric over time as a line or filled area,
so that I can spot trends and spikes.

```
AC1 — One line per series
  Given uan-time-series-chart with kind "line" and two series
  When  it renders
  Then  it draws two lines

AC2 — Area fill
  Given kind "area"
  When  it renders
  Then  the area under each line is filled

AC3 — Y-axis from zero
  Given a series whose values range from 40 to 280
  When  it renders
  Then  the y-axis starts at 0

AC4 — Values formatted
  Given value-format { style: "currency", currency: "EUR" }
  When  the editor hovers a point
  Then  the tooltip shows the value as euros in the backoffice culture

AC5 — Tooltip content
  Given a chart with two series
  When  the editor hovers a date
  Then  the tooltip shows the date and each series' value

AC6 — Legend
  Given a chart with two series
  When  it renders
  Then  the legend lists both series labels

AC7 — Screen reader table
  Given a chart with data
  When  it renders
  Then  a visually hidden table lists every date and value
```

## CHT-2: Compare with another period

As an editor,
I want to see last period's numbers on the same chart,
so that I can tell whether this period is better or worse.

```
AC1 — Dashed compare line
  Given kind "line" with series and compare-series
  When  it renders
  Then  the compare series is drawn as a dashed line in --uan-compare

AC2 — Gap shaded
  Given kind "line" with series and compare-series
  When  it renders
  Then  the space between the two lines is shaded

AC3 — Matched by position
  Given a series for 25 May–23 Jun and a compare series for 25 Apr–24 May
  When  it renders
  Then  the first compare point sits under the first series point

AC4 — Tooltip shows both
  Given a chart with a compare series
  When  the editor hovers a date
  Then  the tooltip shows the current value, the compare value and a change badge

AC5 — Legend shows the compare range
  Given compare-label "Apr 25, 2026 – May 24, 2026"
  When  it renders
  Then  the legend includes that label
```

## CHT-3: Bar and stacked bar chart

As an editor,
I want counts that split into parts shown as stacked bars,
so that I can see both the total and its make-up for each day.

```
AC1 — Bars
  Given kind "bar" with one series
  When  it renders
  Then  each point is drawn as a bar

AC2 — Stacked bars
  Given kind "stacked-bar" with two series
  When  it renders
  Then  each date shows one bar with both series stacked

AC3 — Compare behind
  Given kind "stacked-bar" with compare-series
  When  it renders
  Then  each date shows a --uan-compare bar for the compare total behind the current bar

AC4 — No smoothing
  Given kind "bar"
  When  it renders
  Then  no curve or line is drawn between bars
```

## CHT-4: Event markers

As an editor,
I want events like a campaign launch marked on the chart,
so that I can connect spikes to what caused them.

```
AC1 — Marker drawn
  Given a marker dated 11 Jun 2026 within the chart's range
  When  it renders
  Then  a dot shows on the x-axis at 11 Jun

AC2 — Hover shows details
  Given a marker with title "Spring product launch"
  When  the editor hovers its dot
  Then  a tooltip shows the date, the title and the description

AC3 — Click raises marker-click
  Given a marker with id "m1"
  When  the editor clicks its dot
  Then  it raises marker-click with { id: "m1" }

AC4 — Keyboard access
  Given two markers
  When  the editor tabs into the chart
  Then  focus moves to the markers in date order

Sad path

AC5 — Out-of-range marker
  Given a marker dated outside the chart's range
  When  it renders
  Then  no dot is drawn for it
```

## DR-1: Pick a date range

As an editor,
I want to choose the period an analytics screen covers,
so that I can look at exactly the days I care about.

```
AC1 — Button shows the range
  Given uan-date-range with value 25 May–23 Jun 2026
  When  it renders
  Then  the button reads "May 25, 2026 to Jun 23, 2026" in the backoffice culture

AC2 — Opens the dialog
  Given uan-date-range on screen
  When  the editor clicks it
  Then  uan-date-range-modal opens

AC3 — Preset fills dates
  Given the dialog is open
  When  the editor picks "Last 30 days"
  Then  both date fields show the last 30 days up to today

AC4 — Editing a date switches to Custom
  Given the preset "Last 30 days" is chosen
  When  the editor changes the start date
  Then  the preset shows "Custom"

AC5 — Save applies
  Given the editor changed the range in the dialog
  When  they click Save
  Then  it raises change with the new value

AC6 — Close discards
  Given the editor changed the range in the dialog
  When  they click Close
  Then  no change event is raised

Sad path

AC7 — Invalid range blocks Save
  Given the end date is before the start date
  When  the dialog shows the fields
  Then  Save is disabled

AC8 — Invalid range explained
  Given the end date is before the start date
  When  the dialog shows the fields
  Then  an error shows under the end date
```

## DR-2: Pick a comparison range

As an editor,
I want to compare my range with an earlier one,
so that I can see change over time.

```
AC1 — Compare off by default
  Given uan-date-range with no compare
  When  the dialog opens
  Then  the Compare switch is off

AC2 — Previous period
  Given the range 25 May–23 Jun 2026 and Compare on
  When  the editor picks "Previous period"
  Then  the comparison dates are 25 Apr–24 May 2026

AC3 — Button shows the comparison
  Given a saved comparison
  When  the button renders
  Then  it shows a "Compare to:" line with the comparison range

AC4 — Hidden when not allowed
  Given allow-compare is false
  When  the dialog opens
  Then  there is no Compare switch

Sad path

AC5 — Custom compare validated
  Given Compare is on with mode "Custom"
  When  the comparison end date is before its start
  Then  Save is disabled
```

## TBL-1: Table cells by column type

As an editor,
I want each table column shown in a way that fits its data,
so that I can read and compare rows quickly.

```
AC1 — Number cells
  Given a column of type "number" and value 1234
  When  it renders in the en-US culture
  Then  the cell shows "1,234"

AC2 — Share cell
  Given a "share" column whose values are 210 and 62
  When  it renders
  Then  the first row shows "210 (77.2%)"

AC3 — Second share column colour
  Given two "share" columns
  When  they render
  Then  the second column's bars use --uan-series-2

AC4 — Link cells
  Given a "link" column with hrefKey "url"
  When  it renders
  Then  each cell is an anchor to that row's url

AC5 — Compare badge
  Given compare-rows matched by row-key
  When  a share cell renders
  Then  a small change badge follows the value

AC6 — Toolbar slot
  Given content in the toolbar slot
  When  the table renders
  Then  that content sits above the header row

AC7 — Share bar scaled to the largest value
  Given a "share" column whose values are 210 and 62
  When  it renders
  Then  the 210 row's bar is at full width
```

## TBL-2: Sort by a column

As an editor,
I want to sort a table by any metric,
so that I can find the top and bottom rows.

```
AC1 — Click raises sort-change
  Given a sortable column "pageviews" sorted descending
  When  the editor clicks its header
  Then  it raises sort-change with { key: "pageviews", direction: "asc" }

AC2 — Client mode sorts itself
  Given mode "client"
  When  the editor sorts by "pageviews" descending
  Then  the row with the most pageviews is first

AC3 — Server mode leaves order alone
  Given mode "server"
  When  the editor clicks a sortable header
  Then  the rows keep their order until the product passes new rows

Sad path

AC4 — Non-sortable column
  Given a column with sortable false
  When  the editor clicks its header
  Then  no sort-change is raised
```

## TBL-3: Page through rows

As an editor,
I want long tables split into pages,
so that the screen stays short and fast.

```
AC1 — Footer shows position
  Given 272 rows and page-size 10 on page 1
  When  it renders
  Then  the footer shows "1–10 of 272"

AC2 — Next page
  Given page 1 of 28
  When  the editor clicks next
  Then  it raises page-change with { page: 2, pageSize: 10 }

AC3 — Change page size
  Given page-size 10
  When  the editor picks 25 in "Show rows"
  Then  it raises page-change with { page: 1, pageSize: 25 }

AC4 — Client mode pages itself
  Given mode "client" and 30 rows
  When  the editor moves to page 2
  Then  rows 11–20 are shown

AC5 — Hidden when one page
  Given 8 rows and page-size 10
  When  it renders
  Then  there is no paging footer
```

## TBL-4: Search rows

As an editor,
I want to search a table,
so that I can find one page or campaign without scrolling.

```
AC1 — Search raised after typing stops
  Given uan-table-search in the toolbar
  When  the editor types "contact" and stops for 300ms
  Then  it raises search with { query: "contact" }

AC2 — Client mode filters
  Given mode "client" with rows for /contact/ and /products/
  When  the query is "contact"
  Then  only the /contact/ row is shown

Sad path

AC3 — No matches
  Given mode "client"
  When  the query matches no rows
  Then  the table shows the empty state
```

## TBL-5: Open a row

As an editor,
I want to click a row to see its details,
so that I can drill into one item.

```
AC1 — Click raises row-click
  Given the product listens for row-click
  When  the editor clicks a row
  Then  it raises row-click with that row

AC2 — Keyboard opens a row
  Given the product listens for row-click and a row has focus
  When  the editor presses Enter
  Then  it raises row-click with that row

Sad path

AC3 — Rows not clickable without a listener
  Given no row-click listener
  When  the table renders
  Then  rows are not focusable
```

## INT-1: One copy on a site, ready to use

As a product developer,
I want the package to register itself once in the backoffice,
so that my product and others on the same site share one copy.

```
AC1 — Import map entry
  Given a site with the Umbraco.Analytics.UI NuGet package installed
  When  the backoffice loads
  Then  @umbraco-analytics/ui resolves to /App_Plugins/Umbraco.Analytics.UI/umbraco-analytics-ui.js

AC2 — Localization registered
  Given that site
  When  the backoffice loads
  Then  the uanAnalytics_* keys are available in English

AC3 — Date range modal registered
  Given that site
  When  a uan-date-range button is clicked
  Then  uan-date-range-modal opens through the modal manager

AC4 — Version stamped
  Given a release build
  When  the package is packed
  Then  umbraco-package.json's version matches the NuGet package version
```
