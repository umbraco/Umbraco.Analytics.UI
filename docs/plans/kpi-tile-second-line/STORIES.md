# Stories: KPI tile second line

**6 stories, 36 criteria.** Story ids are used by `PLAN.md` and the spec files, so never renumber them.

Every criterion renders `uaui-kpi-tile` with `lang="en-US"` and `label="Input tokens"`, unless it says otherwise.

**The line**

- [KTD-1](#ktd-1-show-a-part-of-the-total) Show a part of the total, 12 criteria
- [KTD-2](#ktd-2-short-numbers-match-the-value) Short numbers match the value, 5 criteria
- [KTD-3](#ktd-3-no-line-when-there-is-nothing-to-show) No line when there is nothing to show, 6 criteria

**Layout and access**

- [KTD-4](#ktd-4-the-line-and-the-badge) The line and the badge, 7 criteria
- [KTD-5](#ktd-5-screen-readers-hear-the-line) Screen readers hear the line, 3 criteria
- [KTD-6](#ktd-6-loading-keeps-its-size) Loading keeps its size, 3 criteria

<details>
<summary>Ready and Done</summary>

**Ready:** the role, capability and value are all stated. Given/When/Then criteria cover the happy path. Out of scope is explicit. It passes INVEST.

**Done:**
- Every criterion passes as an executable spec, sad paths included.
- `kpi-tile.story.ts` has a story for each state of the line, and each passes axe in light and dark.
- The `api/analytics-ui.api.md` change is committed and signed off, with a `### Added` line in `CHANGELOG.md`.
- `npm run lint`, `npm test` and `npm run build` pass.

</details>

---

## KTD-1: Show a part of the total

As a product developer,
I want to give a tile a number and a pattern like "{0} cached",
so that editors see a small, formatted part of the total under the value, in their own language.

```
AC1 — The pattern is filled with the formatted number
  Given value 134800, detail "{0} cached" and detail-value 114300
  When  the tile renders
  Then  the line reads "114,300 cached"

AC2 — The number follows the editor's language
  Given lang "da-DK", value 134800, detail "{0} cached" and detail-value 114300
  When  the tile renders
  Then  the line reads "114.300 cached"

AC3 — The number uses the value's format by default
  Given value 4837.4, valueFormat { style: "currency", currency: "EUR" }, detail "{0} refunded" and detail-value 120.5
  When  the tile renders
  Then  the line reads "€120.50 refunded"

AC4 — detail-format wins over the value's format
  Given value 0.256, valueFormat { style: "percent" }, detail "{0} orders" and detail-value 1234 with detail-format { style: "decimal" }
  When  the tile renders
  Then  the line reads "1,234 orders"

AC5 — The pattern's word order is the product's
  Given value 134800, detail "Cached: {0}" and detail-value 114300
  When  the tile renders
  Then  the line reads "Cached: 114,300"

AC6 — The attributes work too
  Given value 134800 and the attributes detail="{0} cached", detail-value="114300" and detail-format='{"notation":"compact"}'
  When  the tile renders
  Then  the line reads "114K cached"

AC7 — A pattern with no {0} is a plain note
  Given value 12.4 and detail "Estimated", with no detail-value
  When  the tile renders
  Then  the line reads "Estimated"

AC8 — The line is styled as quieter text
  Given value 134800, detail "{0} cached" and detail-value 114300
  When  the tile renders
  Then  the line's font size is 13px, its weight is 400 and its colour is the tile's --uui-color-text-alt
```

**Sad path and edges**

```
AC9 — Every {0} is filled, other placeholders stay
  Given value 134800, detail "{0} of {1} ({0})" and detail-value 5
  When  the tile renders
  Then  the line reads "5 of {1} (5)"

AC10 — %0% is not a placeholder here
  Given value 134800, detail "%0% cached" and detail-value 5
  When  the tile renders
  Then  the line reads "%0% cached"

AC11 — Markup in the pattern is text
  Given value 134800, detail "<b>{0}</b> cached" and detail-value 5
  When  the tile renders
  Then  the line's text is "<b>5</b> cached"

AC12 — Markup in the pattern adds no elements
  Given value 134800, detail "<b>{0}</b> cached" and detail-value 5
  When  the tile renders
  Then  the line has no b element
```

## KTD-2: Short numbers match the value

As a product developer,
I want the line's number shortened when the value is,
so that "1.28M" never sits above "412,000 from agents".

```
AC1 — The line shortens with the value
  Given value 1280000, detail "{0} from agents" and detail-value 412000
  When  the tile renders
  Then  the line reads "412K from agents"

AC2 — The line's own big number shortens
  Given value 134800, detail "{0} cached" and detail-value 1143000
  When  the tile renders
  Then  the line reads "1.14M cached"

AC3 — A short number has its exact amount on hover
  Given value 1280000, detail "{0} from agents" and detail-value 412000
  When  the tile renders
  Then  the line's short number has the title "412,000"

AC4 — Screen readers get the exact amount
  Given value 1280000, detail "{0} from agents" and detail-value 412000
  When  the tile renders
  Then  the line's accessible text is "412,000 from agents"
```

**Sad path and edges**

```
AC5 — A notation in detail-format is kept
  Given value 1280000, detail "{0} from agents", detail-value 412000 and detail-format { notation: "standard" }
  When  the tile renders
  Then  the line reads "412,000 from agents"
```

## KTD-3: No line when there is nothing to show

As a product developer,
I want the line to stay away when it has nothing to say,
so that I can set it up front without checking every state myself.

```
AC1 — No number for a number pattern
  Given value 134800 and detail "{0} cached", with no detail-value
  When  the tile renders
  Then  there is no line

AC2 — A number that isn't finite
  Given value 134800, detail "{0} cached" and detail-value NaN
  When  the tile renders
  Then  there is no line

AC3 — No pattern
  Given value 134800 and detail-value 114300, with no detail
  When  the tile renders
  Then  there is no line

AC4 — An empty pattern
  Given value 134800, detail "" and detail-value 114300
  When  the tile renders
  Then  there is no line

AC5 — Error and no data hide it
  Given detail "{0} cached" and detail-value 114300, with error set, and again with no-data set
  When  the tile renders
  Then  there is no line in either

AC6 — A tile without a line is unchanged
  Given value 134800 and delta 18.7 in a 300px wide cell, with no detail
  When  the tile renders
  Then  its height is the same as before this feature (the tile's content is 48px tall)
```

## KTD-4: The line and the badge

As an editor,
I want the value and its part to stay together, with the change badge beside the value when there's room,
so that I read the tile at a glance on wide and narrow dashboards.

```
AC1 — Badge beside the value when they fit
  Given value 134800, delta 18.7, detail "{0} cached" and detail-value 114300, in a 400px wide cell
  When  the tile renders
  Then  the badge's top is level with the value's

AC2 — The line under both when they fit
  Given value 134800, delta 18.7, detail "{0} cached" and detail-value 114300, in a 400px wide cell
  When  the tile renders
  Then  the line's top is below the bottom of both the value and the badge

AC3 — Badge below the line when they don't fit
  Given value 134800, delta 18.7, detail "{0} cached" and detail-value 114300, in a 200px wide cell
  When  the tile renders
  Then  the order from top to bottom is the value, the line, then the badge

AC4 — It follows the real widths, not the tile width
  Given two tiles in 260px wide cells, both with delta 18.7, detail "{0} cached" and detail-value 114300, one with value 5 and one with value "€1,234,567.89"
  When  they render
  Then  the badge is beside the value in the first and below the line in the second

AC5 — It updates as the tile resizes
  Given value 134800, delta 18.7, detail "{0} cached" and detail-value 114300, in a 400px wide cell
  When  the cell narrows to 200px
  Then  the badge moves below the line

AC6 — A long line is cut
  Given value 134800, detail "{0} cached by the provider this period" and detail-value 1143000, in a 200px wide cell
  When  the tile renders
  Then  the line does not overflow the tile and its title is the full text "1.14M cached by the provider this period"
```

**Sad path and edges**

```
AC7 — No badge, nothing to measure
  Given value 134800, detail "{0} cached" and detail-value 114300, with no delta
  When  the tile renders
  Then  the line is directly below the value
```

## KTD-5: Screen readers hear the line

As an editor using a screen reader,
I want the line read with the value,
so that I hear the part of the total as part of the tile.

```
AC1 — Read in order
  Given value 134800, delta 18.7, detail "{0} cached" and detail-value 114300
  When  the tile's text is read in order
  Then  the line comes after the value and before the badge

AC2 — Part of a link's name
  Given href "/tokens", value 134800, detail "{0} cached" and detail-value 114300
  When  the tile renders
  Then  the link's accessible name contains "114,300 cached"

AC3 — No axe violations
  Given value 134800, delta 18.7, detail "{0} cached" and detail-value 114300, in light and in dark
  When  axe runs on the tile
  Then  it has no violations
```

## KTD-6: Loading keeps its size

As an editor,
I want a loading tile to be the size it will be once loaded,
so that the dashboard doesn't jump when numbers arrive.

```
AC1 — The placeholder makes room for the line
  Given loading, detail "{0} cached" and no value, in a 300px and in a 200px wide cell
  When  the tile renders
  Then  its height matches the same tile loaded with value 134800, delta 18.7 and detail-value 114300 in the same cell

AC2 — No room without a line
  Given loading and no value, with no detail
  When  the tile renders
  Then  its height is the same as before this feature

AC3 — The line stays while reloading
  Given loading, value 134800, detail "{0} cached" and detail-value 114300
  When  the tile renders
  Then  the line reads "114,300 cached"
```
