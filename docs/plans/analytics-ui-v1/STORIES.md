# Stories: Analytics UI v1

**31 stories, 181 criteria.** Story ids are used by `PLAN.md` and the spec files, so never renumber them.

> [!IMPORTANT]
> **3 guesses need your OK.**
> - The Definition of Ready and Done below are starting points, not agreed team rules.
> - "Product developer" is the role for anything a developer wires up, and "editor" for anything a person reads or clicks on screen.
> - Criteria with exact numbers (300ms search delay, page sizes 10/25/50/100, about 5 y-axis ticks) come from SPEC.md. Change them there first if they're wrong.

**Foundation**

- [FND-1](#fnd-1-theme-tokens-products-can-override) Theme tokens products can override, 4 criteria
- [FND-2](#fnd-2-built-in-text-is-translated) Built-in text is translated, 3 criteria
- [FND-3](#fnd-3-empty-and-loading-states) Empty and loading states, 6 criteria

**Small elements**

- [BDG-1](#bdg-1-change-badge-matches-the-design) Change badge matches the design, 7 criteria
- [KPI-1](#kpi-1-kpi-tile-shows-a-headline-number) KPI tile shows a headline number, 7 criteria
- [KPI-2](#kpi-2-kpi-tiles-switch-the-charts-metric) KPI tiles switch the chart's metric, 9 criteria
- [KPI-3](#kpi-3-kpi-tile-with-no-data) KPI tile with no data, 6 criteria
- [GRP-1](#grp-1-day--week--month-switch) Day / Week / Month switch, 4 criteria
- [SEG-1](#seg-1-toggle-group) Toggle group, 6 criteria
- [ERR-1](#err-1-error-state) Error state, 6 criteria
- [ERR-2](#err-2-chart-table-and-tile-in-error) Chart, table and tile in error, 7 criteria

**Time-series chart**

- [CHT-1](#cht-1-line-and-area-chart) Line and area chart, 7 criteria
- [CHT-2](#cht-2-compare-with-another-period) Compare with another period, 5 criteria
- [CHT-3](#cht-3-bar-and-stacked-bar-chart) Bar and stacked bar chart, 4 criteria
- [CHT-4](#cht-4-event-markers) Event markers, 5 criteria
- [CHT-5](#cht-5-compare-points-under-the-same-bucket) Compare points under the same bucket, 8 criteria

**Date range**

- [DR-1](#dr-1-pick-a-date-range) Pick a date range, 8 criteria
- [DR-2](#dr-2-pick-a-comparison-range) Pick a comparison range, 5 criteria
- [DR-3](#dr-3-the-button-with-a-comparison) The button with a comparison, 5 criteria
- [DR-4](#dr-4-a-fixed-today) A fixed today, 6 criteria
- [DAT-1](#dat-1-public-date-helpers) Public date helpers, 8 criteria

**Data table**

- [TBL-1](#tbl-1-table-cells-by-column-type) Table cells by column type, 7 criteria
- [TBL-2](#tbl-2-sort-by-a-column) Sort by a column, 4 criteria
- [TBL-3](#tbl-3-page-through-rows) Page through rows, 5 criteria
- [TBL-4](#tbl-4-search-rows) Search rows, 3 criteria
- [TBL-5](#tbl-5-open-a-row) Open a row, 3 criteria
- [TBL-6](#tbl-6-column-toolbar) Column toolbar, 13 criteria
- [TBL-7](#tbl-7-compare-badge-in-value-cells) Compare badge in value cells, 6 criteria
- [TBL-8](#tbl-8-compact-pager-label) Compact pager label, 3 criteria
- [SRV-1](#srv-1-server-table-wiring) Server table wiring, 11 criteria

**Integration**

- [INT-1](#int-1-one-copy-on-a-site-ready-to-use) One copy on a site, ready to use, 4 criteria

Not a story: the `uui-box` pane recipe (SPEC.md §1) is a Storybook story with no behaviour of its own. `PLAN.md` carries it as a docs task.

<details>
<summary>Ready and Done</summary>

**Ready:** the role, capability and value are all stated. Given/When/Then criteria cover the happy path. Out of scope is explicit. It passes INVEST.

**Done:**
- Every criterion passes as an executable spec, sad paths included.
- The element has Storybook stories for each state, and passes axe in light and dark.
- It's exported from `src/index.ts`, and the `api/analytics-ui.api.md` change is committed.
- `npm run lint`, `npm test` and `npm run build` pass.

</details>

---

## FND-1: Theme tokens products can override

As a product developer,
I want the package's colours exposed as CSS custom properties,
so that my analytics screen can follow my product's palette without forking the elements.

```
AC1 — Default series colours
  Given an element from the package on a page with no overrides, in the light theme
  When  it renders
  Then  its series 1 colour resolves to --uui-palette-space-cadet

AC2 — Override from a parent
  Given a parent element that sets --uaui-series-1 to a different colour
  When  an element from the package renders inside it
  Then  the element uses the parent's colour

AC3 — Tints follow the theme
  Given a parent that changes --uui-color-positive, as a theme does
  When  the element's positive tint is read
  Then  it is derived from the parent's --uui-color-positive, not a fixed colour

AC4 — Dark theme picks the dark shade
  Given the dark theme is active (--uui-color-scheme: dark)
  When  an element from the package renders
  Then  its series 1 colour resolves to --uui-palette-malibu-light
```

## FND-2: Built-in text is translated

As an editor,
I want every label in the analytics elements in my backoffice language,
so that the screen reads naturally next to the rest of Umbraco.

```
AC1 — Strings come from localization keys
  Given an element that shows built-in text such as "No data yet"
  When  it renders in a backoffice set to English
  Then  the text is the translation for its uauiAnalytics_* key, not the raw key

AC2 — Product can override a string
  Given a product registers its own localization for uauiAnalytics_emptyHeadline
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
  Given a uaui-empty-state with headline "No pageviews yet"
  When  it renders
  Then  the headline reads "No pageviews yet"

AC2 — Default empty text
  Given a data element with no data and no empty-headline set
  When  it renders
  Then  it shows uaui-empty-state with the "No data yet" translation

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
  Given uaui-delta-badge with value 12.4
  When  it renders
  Then  it shows "+12.4%" on a positive tint

AC2 — Negative pill
  Given uaui-delta-badge with value -3
  When  it renders
  Then  it shows "-3%" on a danger tint

AC3 — Flat pill
  Given uaui-delta-badge with value 0.02 and max-decimals 1
  When  it renders
  Then  it shows "0%" on a neutral tint

AC4 — Lower is better
  Given uaui-delta-badge with value -1.2, unit "points" and lower-is-better
  When  it renders
  Then  it shows "-1.2 pp" on a positive tint

AC5 — Small size
  Given uaui-delta-badge with size "sm"
  When  it renders
  Then  it uses the small font size and padding

AC6 — Culture-aware number
  Given the backoffice culture is da-DK
  When  uaui-delta-badge renders value 12.4
  Then  it shows "+12,4 %"

AC7 — Sentiment is not colour only
  Given uaui-delta-badge with value -1.2, unit "points" and lower-is-better
  When  it renders
  Then  it has visually hidden text saying "improvement"
```

## KPI-1: KPI tile shows a headline number

As an editor,
I want key numbers shown as tiles at the top of an analytics screen,
so that I see the headline results before reading charts.

```
AC1 — Label
  Given uaui-kpi-tile with label "Revenue"
  When  it renders
  Then  it shows "Revenue"

AC2 — Change badge
  Given uaui-kpi-tile with delta 18.7
  When  it renders
  Then  it shows a uaui-delta-badge with "+18.7%"

AC3 — No badge without a delta
  Given uaui-kpi-tile with no delta
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
  Given uaui-kpi-tile with value "€ 4,837.40"
  When  it renders
  Then  it shows "€ 4,837.40" exactly

AC7 — Icon
  Given uaui-kpi-tile with icon "icon-coins"
  When  it renders
  Then  it shows that icon
```

## KPI-2: KPI tiles switch the chart's metric

As an editor,
I want to click a KPI tile to see its metric in the chart below,
so that I can explore each number without leaving the screen.

```
AC1 — Click raises selected
  Given a uaui-kpi-tile with selectable set
  When  the editor clicks it
  Then  it raises a selected event

AC2 — Keyboard raises selected
  Given a selectable tile with keyboard focus
  When  the editor presses Enter
  Then  it raises a selected event

AC3 — Selected state
  Given a selectable tile with selected set
  When  it renders
  Then  it reports aria-pressed="true"

AC5 — Selecting sets selected
  Given a selectable, unselected tile
  When  the editor clicks it
  Then  its selected property is true

AC6 — Clicking a selected tile deselects it
  Given a selectable, selected tile
  When  the editor clicks it
  Then  it raises a deselected event

AC7 — Deselecting clears selected
  Given a selectable, selected tile
  When  the editor clicks it
  Then  its selected property is false

Sad path

AC4 — Not selectable by default
  Given a uaui-kpi-tile without selectable
  When  the editor clicks it
  Then  no selected event is raised

AC8 — Cancelled select keeps it unselected
  Given a selectable tile whose selected event the product cancels
  When  the editor clicks it
  Then  its selected property stays false

AC9 — Not deselectable
  Given a selectable, selected tile with deselectable false
  When  the editor clicks it
  Then  its selected property stays true
```

## GRP-1: Day / Week / Month switch

As an editor,
I want to switch a chart between daily, weekly and monthly points,
so that I can see short spikes or long trends.

```
AC1 — Shows the current value
  Given uaui-group-by with value "week"
  When  it renders
  Then  "Week" is the checked option

AC2 — Click changes value
  Given uaui-group-by with value "day"
  When  the editor clicks "Month"
  Then  it raises change with { value: "month" }

AC3 — Arrow keys change value
  Given uaui-group-by with focus on "Day"
  When  the editor presses the right arrow key
  Then  it raises change with { value: "week" }

AC4 — Limited options
  Given uaui-group-by with options ["day", "week"]
  When  it renders
  Then  only "Day" and "Week" are shown
```

## CHT-1: Line and area chart

As an editor,
I want to see a metric over time as a line or filled area,
so that I can spot trends and spikes.

```
AC1 — One line per series
  Given uaui-time-series-chart with kind "line" and two series
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
  Then  the compare series is drawn as a dashed line in --uaui-compare

AC2 — Gap shaded
  Given kind "line" with series and compare-series
  When  it renders
  Then  the space between the two lines is shaded

AC3 — Matched by bucket offset
  Given a series for 25 May–23 Jun and a compare series for 25 Apr–24 May
  When  it renders
  Then  the first compare point sits under the first series point
  And   with week or month grouping, the Nth compare bucket sits under the Nth series bucket, even when calendar weeks or months do not line up
  And   when the chart is given `range` and `compare`, buckets count from the start of each range, so sparse data missing a range's first buckets stays aligned

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
  Then  each date shows a --uaui-compare bar for the compare total behind the current bar

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
  Given uaui-date-range with value 25 May–23 Jun 2026
  When  it renders
  Then  the button reads "May 25, 2026 to Jun 23, 2026" in the backoffice culture

AC2 — Opens the dialog
  Given uaui-date-range on screen
  When  the editor clicks it
  Then  uaui-date-range-modal opens

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
  Given uaui-date-range with no compare
  When  the dialog opens
  Then  the Compare switch is off

AC2 — Previous period
  Given the range 25 May–23 Jun 2026 and Compare on
  When  the editor picks "Previous period"
  Then  the comparison dates are 25 Apr–24 May 2026

AC3 — Button shows the comparison
  Given a saved comparison
  When  the button renders
  Then  it shows a second "vs …" line with the comparison range (see DR-3)

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

## DR-3: The button with a comparison

As an editor,
I want the date range button to show the comparison without growing,
so that it sits level with the other header controls.

```
AC1 — Same height
  Given uaui-date-range next to uaui-group-by
  When  the button renders with and without a comparison
  Then  it is as tall as uaui-group-by in both cases

AC2 — Two lines
  Given a saved comparison of 25 Apr–24 May 2026 and the range 25 May–23 Jun 2026
  When  the button renders
  Then  line 2 reads "vs Apr 25 to May 24" (en-US)

AC3 — Year kept across years
  Given a comparison in a different year from the range
  When  the button renders
  Then  line 2 shows the years

AC4 — Name matches what is shown
  Given a saved comparison
  When  a screen reader reads the button
  Then  its name is the purpose, line 1 and line 2 as shown

AC5 — Narrow header
  Given a header too narrow for the dates
  When  the button renders
  Then  the dates are cut short with an ellipsis, inside the button, left to right and right to left
```

## TBL-1: Table cells by column type

As an editor,
I want each table column shown in a way that fits its data,
so that I can read and compare rows quickly.

```
AC1 — Number cells
  Given a number column (`UAUI_TABLE_CELL.number`) and value 1234
  When  it renders in the en-US culture
  Then  the cell shows "1,234"

AC2 — Share cell
  Given a share column whose values are 210 and 62
  When  it renders
  Then  the first row shows "210 (77.2%)"

AC3 — Second share column colour
  Given two share columns
  When  they render
  Then  the second column's bars use --uaui-series-2

AC4 — Link cells
  Given a link column with hrefKey "url"
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
  Given a share column whose values are 210 and 62
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
  When  the editor picks 25 in "Per page"
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
  Given uaui-search-field in the toolbar
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
  Given the table has clickable-rows and the product listens for row-click
  When  the editor clicks a row
  Then  it raises row-click with that row

AC2 — Keyboard opens a row
  Given the table has clickable-rows, the product listens for row-click and a row has focus
  When  the editor presses Enter
  Then  it raises row-click with that row

Sad path

AC3 — Rows not clickable without a listener
  Given the table does not have clickable-rows
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
  Then  @umbraco/analytics-ui resolves to /App_Plugins/Umbraco.Analytics.UI/umbraco-analytics-ui.js

AC2 — Localization registered
  Given that site
  When  the backoffice loads
  Then  the uauiAnalytics_* keys are available in English

AC3 — Date range modal registered
  Given that site
  When  a uaui-date-range button is clicked
  Then  uaui-date-range-modal opens through the modal manager

AC4 — Version stamped
  Given a release build
  When  the package is packed
  Then  umbraco-package.json's version matches the NuGet package version
```

## KPI-3: KPI tile with no data

As an editor,
I want a tile to say "no data" when the period has none,
so that I don't read an empty metric as a real zero.

```
AC1 — Dash in place of the value
  Given a uaui-kpi-tile with no-data set and a label
  When  it renders
  Then  it shows a dash and no value, and keeps its label

AC2 — Screen readers hear it
  Given a tile with no-data set
  When  a screen reader reads it
  Then  it hears "No data yet" (the dash itself is hidden)

AC3 — No badge
  Given a tile with no-data set and a delta
  When  it renders
  Then  it shows no change badge

AC4 — Same height
  Given a tile with no-data next to a tile with a value
  When  they render
  Then  both are the same height

AC5 — Still selectable
  Given a selectable tile with no-data set
  When  the editor clicks it
  Then  it raises a selected event

Sad path

AC6 — No data while loading
  Given a tile with no-data and loading set
  When  it renders
  Then  it keeps the dash instead of a skeleton
  And   its content is marked busy
```

## ERR-1: Error state

As a product developer,
I want a "could not load" message with an optional Retry button,
so that an editor can tell a failed request from an empty result.

```
AC1 — Default text
  Given uaui-error-state with no headline or description
  When  it renders
  Then  it shows "Something went wrong" and "The data could not be loaded." with an alert icon

AC2 — The product's text
  Given a headline, description and icon set
  When  it renders
  Then  it shows that text and that icon

AC3 — Announced
  Given uaui-error-state
  When  it appears
  Then  it is announced as an alert

AC4 — A line can be left out
  Given a description set to an empty string
  When  it renders
  Then  the description line is not shown

AC5 — Retry raises retry
  Given uaui-error-state with retryable set
  When  the editor presses Retry
  Then  it raises retry
  And   the event bubbles and is not composed

Sad path

AC6 — No Retry unless asked
  Given uaui-error-state without retryable
  When  it renders
  Then  it shows no Retry button
```

## ERR-2: Chart, table and tile in error

As an editor,
I want a chart, table or tile whose data failed to load to say so,
so that I know to retry instead of waiting or reading stale numbers.

```
AC1 — Chart shows the error state
  Given a uaui-time-series-chart with error set
  When  it renders
  Then  it shows uaui-error-state in place of the plot, with no empty state

AC2 — Table shows the error state
  Given a uaui-data-table with error set and rows
  When  it renders
  Then  it shows uaui-error-state, keeps the header row, and shows no rows, column toolbar, pager or empty state

AC3 — Retry on the chart and table
  Given a chart or table with error and retryable set
  When  the editor presses Retry
  Then  the chart or table raises retry once

AC4 — Clearing the error
  Given a chart or table in error
  When  error is cleared
  Then  the error state goes, and the table's rows are back

AC5 — Tile shows a dash
  Given a uaui-kpi-tile with error set
  When  it renders
  Then  it keeps its label, shows a dash with the hidden text "Something went wrong", and shows no change badge

AC6 — The product's text
  Given a chart with error-headline set
  When  it renders
  Then  its error state shows that headline

Sad path

AC7 — Error wins over loading and no-data
  Given a chart, table or tile with error and loading set (a tile also with no-data)
  When  it renders
  Then  it shows the error, with no skeleton or loading bar, and it is not busy
  And   a tile shows the error text, not the no-data text
```

## SEG-1: Toggle group

As a product developer,
I want a toggle group for choosing exactly one option from a short list,
so that my screens switch views the way the group-by switch does.

```
AC1 — Shows the options
  Given uaui-toggle-group with options and a label
  When  it renders
  Then  it shows each option's label in order, as a radio group named by the label

AC2 — Shows the current value
  Given a value that matches an option
  When  it renders
  Then  that option is checked, the others are not, and only it is in the tab order

AC3 — Click changes value
  Given an unselected option
  When  the editor clicks it
  Then  it raises change with { value } and its value property is updated
  And   the event bubbles and is not composed

AC4 — Arrow keys
  Given focus on the first option
  When  the editor presses the right arrow key
  Then  the next option is selected and has focus
  And   the left arrow key on the first option selects the last

Sad path

AC5 — Clicking the selected option
  Given the selected option
  When  the editor clicks it
  Then  it raises nothing

AC6 — A value that is not an option
  Given a value that matches no option
  When  it renders
  Then  the first option has the tab stop
```

## CHT-5: Compare points under the same bucket

As a product developer,
I want to say where each period starts,
so that last period's points line up under this period's even when the data skips buckets.

```
AC1 — Weeks line up by offset
  Given week grouping, with current weeks starting 1, 8 and 15 Jun and compare weeks 4 May and 18 May (11 May missing)
  When  the chart builds its data
  Then  the compare values are under the 1st and 3rd weeks, with the 2nd empty

AC2 — Months line up by offset
  Given month grouping and compare months of different lengths
  When  the chart builds its data
  Then  the Nth compare month sits under the Nth current month

AC3 — A mid-week start
  Given a compare start in the middle of a week
  When  the chart builds its data
  Then  it is read as the week it falls in

AC4 — Given ranges set the anchor
  Given range and compare whose first week has no data
  When  the chart builds its data
  Then  buckets count from the start of each range, so the compare points stay aligned

AC5 — Each compare point keeps its date
  Given a compare series
  When  the chart builds its data
  Then  each compare point reports the date it really has

AC6 — Points on one date add up
  Given two points of a series, or two compare points, on the same date
  When  the chart builds its data
  Then  they are added together

Sad path

AC7 — No range given
  Given no range and compare
  When  the current data misses its first week
  Then  each side starts at its first point, as before

AC8 — A shorter compare
  Given a compare period shorter than the current one
  When  the chart builds its data
  Then  the trailing dates are empty, and compare points past the last current date are dropped
```

## DR-4: A fixed today

As a product developer,
I want to tell the date range what today is,
so that presets match fixed example data instead of the real clock.

```
AC1 — Presets count from it
  Given uaui-date-range with today "2026-06-23"
  When  the editor chooses "Last 7 days"
  Then  the dates are 2026-06-17 to 2026-06-23

AC2 — The date fields stop at it
  Given today "2026-06-23" and no max-date
  When  the dialog opens
  Then  the latest date the fields accept is 2026-06-23

AC3 — The default value follows it
  Given today "2026-06-23" and no value
  When  the button renders
  Then  it shows the last 30 days as of that day, and shows the new range when today changes

AC4 — A given value is kept
  Given a value and today
  When  the button renders
  Then  it shows the value as given

AC5 — max-date wins
  Given today "2026-06-23" and max-date "2026-06-30"
  When  the dialog opens
  Then  the latest date the fields accept is 2026-06-30

Sad path

AC6 — Not a real date
  Given today "soon"
  When  the dialog opens
  Then  it uses the clock, with no error
```

## DAT-1: Public date helpers

As a product developer,
I want the package's date maths as functions,
so that my page builds the same compare ranges, buckets and labels as the picker and chart, without the picker.

```
AC1 — Previous period
  Given a range
  When  uauiPreviousPeriod is called
  Then  it returns the same number of days straight before it

AC2 — Previous year
  Given a range
  When  uauiPreviousYear is called
  Then  it returns the same dates one year earlier

AC3 — Compare for a mode
  Given a range
  When  uauiCompareFor is called with "previous-period" or "previous-year"
  Then  it returns a UauiCompare with those dates

AC4 — Days in a range
  Given a range
  When  uauiDaysIn is called
  Then  it lists every day, both ends included

AC5 — Buckets
  Given a range and a group-by
  When  uauiDateBuckets is called
  Then  day buckets start on their day, week buckets on their Monday (even before the range starts) and month buckets on the 1st
  And   each bucket's days hold only days inside the range

AC6 — Label
  Given a range or a UauiCompare and a localizer
  When  uauiFormatDateRange is called
  Then  it returns both dates in the localizer's medium style joined with "to"
  And   with showYear false the year is left off

Sad path

AC7 — Invalid range
  Given a range that isn't valid
  When  uauiPreviousPeriod, uauiDaysIn or uauiDateBuckets is called
  Then  it returns undefined, an empty list or no buckets

AC8 — Custom comparison
  Given mode "custom"
  When  uauiCompareFor is called
  Then  it returns undefined
```

## TBL-6: Column toolbar

As a product developer,
I want to put a total under its own column,
so that the number lines up with the column header and the figures below it.

```
AC1 — Content sits in its column
  Given content slotted as toolbar-pageviews in a table with a pageviews column
  When  it renders
  Then  a column toolbar shows it in that column's cell, lined up with the header, with the column's alignment

AC2 — One cell per column
  Given a toolbar slot for one column
  When  it renders
  Then  the row has one cell per column

AC3 — Above the data, not counted
  Given a column toolbar and data rows
  When  it renders
  Then  the column toolbar comes first, directly above the header, and is not counted among the data rows

AC4 — Not sorted
  Given a column toolbar
  When  the editor sorts the table
  Then  the column toolbar stays first

AC5 — Content that arrives later
  Given a table with no column toolbar content
  When  content is slotted later
  Then  the row appears, and it goes again when the content goes

AC6 — Table semantics
  Given a column toolbar
  When  it renders
  Then  it is a row of the table and holds cells

Sad path

AC7 — Nothing slotted
  Given no column toolbar content
  When  it renders
  Then  no column toolbar shows

AC8 — A column the table doesn't have
  Given content slotted as toolbar-missing
  When  it renders
  Then  no column toolbar shows

AC9 — In error
  Given a table in error
  When  it renders
  Then  the column toolbar is hidden

AC10 — toolbar-start
  Given content slotted as toolbar-start, whatever the first column's key
  When  it renders
  Then  the column toolbar shows it in the first column's cell, on its own, lined up with that column

AC11 — Search in toolbar-start
  Given a uaui-search-field slotted as toolbar-start
  When  it raises search
  Then  the table sets its query and filters, like a search in the toolbar slot

AC12 — Both slots filled
  Given content in toolbar-start and in toolbar-<first column key>
  When  it renders
  Then  both show in the first column's cell, toolbar-start first

AC13 — A column keyed start
  Given a column whose key is start
  When  it renders
  Then  toolbar-start is still the first column's cell, the start column has no slot of its own, and the slot is drawn once
```

## TBL-7: Compare badge in value cells

As an editor,
I want a change badge next to each compared value,
so that I can see how each row moved against last period.

```
AC1 — Number and percent cells
  Given a table with compare-rows and a row-key, and a row that has a compare row
  When  a number cell or a percent cell renders
  Then  it shows a change badge

AC2 — Higher is better
  Given a rise against the compare row
  When  the badge renders
  Then  it is positive

AC3 — Lower is better
  Given a column with meta.lowerIsBetter and a rise
  When  the badge renders
  Then  it is negative

AC4 — A product's own cell
  Given a custom cell that uses uaui-table-compare-badge with column, item and value
  When  it renders
  Then  it shows the badge

Sad path

AC5 — No compare row
  Given a row with no compare row
  When  its cell renders
  Then  it shows no badge

AC6 — No compare rows
  Given a table without compare-rows
  When  it renders
  Then  no cell shows a badge
```

## TBL-8: Compact pager label

As an editor,
I want the table's pager to read plainly,
so that I can tell the page size and where I am at a glance.

```
AC1 — Page size label
  Given a table with 272 rows, 10 per page
  When  the pager renders
  Then  the page size select is labelled "Per page" and offers 10, 25, 50 and 100

AC2 — Position
  Given that table on page 1
  When  the pager renders
  Then  it shows "1–10 of 272"

AC3 — Landmark
  Given the pager
  When  a screen reader lists landmarks
  Then  it is a navigation named "Pagination"
```

## SRV-1: Server table wiring

As a product developer,
I want one helper to run a server-mode table,
so that I don't rewrite the sort, page, search, abort and error wiring on every page.

```
AC1 — First load
  Given a UauiTableServerController attached to a table, on a host that connects
  When  the host connects
  Then  it loads the starting state, sets the table to server mode, shows it loading, and shows the starting sort and page size

AC2 — The answer goes to the table
  Given a load that answers with rows, compareRows, totalRows and stats
  When  it resolves
  Then  the table has all four, and `result` hands the whole answer back to the page

AC3 — Sort and search
  Given a loaded table
  When  the editor sorts or searches
  Then  it loads with the new sort or query, goes back to page 1 and keeps the page size
  And   a search with the same query loads nothing

AC4 — Paging
  Given a loaded table
  When  the editor changes page or page size
  Then  it loads that page and size

AC5 — Reload
  Given a loaded table
  When  the page calls reload (with resetPage)
  Then  it loads the same state again (from page 1), keeping the old rows under a loading bar

AC6 — A failed request
  Given a load that rejects
  When  it fails
  Then  the table's error is set and Retry is offered, the old rows stay in `result`, and onError is called
  And   pressing Retry loads the same state again
  And   the error clears when the next request starts

AC7 — Retry can be off
  Given the option retryable false
  When  a request fails
  Then  the table's retryable stays false

Sad path

AC8 — Newer wins
  Given a request still on its way
  When  a newer request starts
  Then  the older one is aborted, and its answer is dropped even if it arrives later or first

AC9 — Aborted is not an error
  Given a request that rejects because it was aborted
  When  it ends
  Then  no error is set and onError is not called

AC10 — Disconnected host
  Given a host that is disconnected
  When  reload is called, or an aborted request rejects
  Then  no request starts and no error is set
  And   the host leaving the page aborts its request

AC11 — A replaced table
  Given the page draws another table
  When  it attaches
  Then  the old table is no longer listened to, and the new table gets the last rows, page and sort
```
