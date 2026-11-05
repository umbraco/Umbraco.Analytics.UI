# Stories: Hourly buckets

**10 stories, 56 criteria.** Story ids are used by `PLAN.md` and the spec files, so never renumber them.

Every criterion runs with the browser's time zone pinned to `Europe/Copenhagen` (CET, +01:00 in November) and the backoffice culture `en-US`, unless it says otherwise.

**Foundation**

- [HRS-1](#hrs-1-time-buckets-for-a-range) Time buckets for a range, 7 criteria

**Time series chart**

- [HRS-2](#hrs-2-one-bar-per-hour) One bar per hour, 8 criteria
- [HRS-3](#hrs-3-compare-hour-for-hour) Compare hour for hour, 4 criteria
- [HRS-4](#hrs-4-the-now-line) The now line, 9 criteria
- [HRS-5](#hrs-5-incomplete-hours) Incomplete hours, 3 criteria
- [HRS-6](#hrs-6-hour-labels) Hour labels, 7 criteria

**Controls**

- [HRS-7](#hrs-7-group-by-hour) Group by hour, 6 criteria
- [HRS-8](#hrs-8-today-and-yesterday-presets) Today and Yesterday presets, 7 criteria
- [HRS-9](#hrs-9-a-one-day-range-reads-as-one-date) A one-day range reads as one date, 3 criteria

**Shipping**

- [HRS-10](#hrs-10-ai-usage-example-shows-today-by-hour) AI usage example shows Today by hour, 2 criteria

<details>
<summary>Ready and Done</summary>

**Ready:** the role, capability and value are all stated. Given/When/Then criteria cover the happy path. Out of scope is explicit. It passes INVEST.

**Done:**
- Every criterion passes as an executable spec, sad paths included.
- Changed elements have Storybook stories for the hourly states, and pass axe in light and dark.
- The `api/analytics-ui.api.md` change is committed and signed off.
- `npm run lint`, `npm test` and `npm run build` pass.

</details>

---

## HRS-1: Time buckets for a range

As a product developer,
I want the hours of a range as UTC start and end times,
so that I can ask my server for hourly counts that match the editor's local hours.

```
AC1 — One day by hour
  Given the range 2026-11-05 to 2026-11-05
  When  I call uauiTimeBuckets(range, "hour")
  Then  it returns 24 buckets

AC2 — Each hour starts at a UTC instant
  Given the range 2026-11-05 to 2026-11-05
  When  I call uauiTimeBuckets(range, "hour")
  Then  the first bucket's start is "2026-11-04T23:00:00.000Z" and its end is "2026-11-05T00:00:00.000Z"

AC3 — Each hour names its local day
  Given the range 2026-11-05 to 2026-11-05
  When  I call uauiTimeBuckets(range, "hour")
  Then  every bucket's days is ["2026-11-05"]

AC4 — Day buckets gain an end
  Given the range 2026-11-01 to 2026-11-03
  When  I call uauiTimeBuckets(range, "day")
  Then  the first bucket's end is "2026-11-02"

AC5 — Month buckets end on the 1st of the next month
  Given the range 2026-01-15 to 2026-02-10
  When  I call uauiTimeBuckets(range, "month")
  Then  the first bucket's end is "2026-02-01"

Sad path

AC6 — The day clocks go forward
  Given the range 2026-03-29 to 2026-03-29
  When  I call uauiTimeBuckets(range, "hour")
  Then  it returns 23 buckets

AC7 — The day clocks go back
  Given the range 2026-10-25 to 2026-10-25
  When  I call uauiTimeBuckets(range, "hour")
  Then  it returns 25 buckets
```

Out of scope: an invalid range still returns no buckets, as `uauiDateBuckets` did.

## HRS-2: One bar per hour

As an editor,
I want a short range drawn as one bar per hour,
so that I can see when in the day something happened.

```
AC1 — One bar per hourly point
  Given group-by "hour" and 24 points from "2026-11-04T23:00:00Z" to "2026-11-05T22:00:00Z"
  When  the chart builds its data
  Then  it has 24 dates

AC2 — UTC points land in the local hour
  Given group-by "hour" and a point at "2026-11-05T13:00:00Z"
  When  the hidden table renders
  Then  its row is "Nov 5, 2026, 2 PM"

AC3 — A point with an offset lands in the local hour
  Given group-by "hour" and a point at "2026-11-05T14:00:00+01:00"
  When  the hidden table renders
  Then  its row is "Nov 5, 2026, 2 PM"

AC4 — A point with no offset is local time
  Given group-by "hour" and a point at "2026-11-05T14:00"
  When  the hidden table renders
  Then  its row is "Nov 5, 2026, 2 PM"

AC5 — Points in the same hour add up
  Given group-by "hour" and points of 3 at "2026-11-05T14:00" and 4 at "2026-11-05T14:30"
  When  the chart builds its data
  Then  it has one date, with the value 7

AC6 — Day grouping doesn't change
  Given group-by "day" and a point at "2026-06-11T00:00:00Z"
  When  the chart builds its data
  Then  its date is "2026-06-11"

Sad path

AC7 — A plain date is local midnight
  Given group-by "hour" and a point at "2026-11-05"
  When  the hidden table renders
  Then  its row is "Nov 5, 2026, 12 AM"

AC8 — The repeated hour stays two bars
  Given group-by "hour" and points at "2026-10-25T00:00:00Z" and "2026-10-25T01:00:00Z" (both 2 AM local)
  When  the chart builds its data
  Then  it has two dates
```

## HRS-3: Compare hour for hour

As an editor,
I want yesterday's hours under today's,
so that I can tell whether this hour is normal.

```
AC1 — Hours line up by clock time
  Given group-by "hour", range 2026-11-05, compare 2026-11-04, and points at 2 PM on both days
  When  the chart builds its data
  Then  the compare value sits under the 2 PM date

AC2 — The compare point keeps its own date
  Given group-by "hour" and a compare point at 1 PM on 2026-11-04
  When  the tooltip shows the 1 PM bar
  Then  the compare row is named "Nov 4, 2026, 1 PM"

Sad path

AC3 — Across the day clocks go back
  Given group-by "hour", range 2026-10-26, compare 2026-10-25, and points at 2 PM on both days
  When  the chart builds its data
  Then  the compare value sits under the 2 PM date

AC4 — The repeated compare hour adds up
  Given group-by "hour", compare 2026-10-25, and compare points of 5 and 6 in its two 2 AM hours
  When  the chart builds its data
  Then  the compare value under 2 AM is 11
```

## HRS-4: The now line

As an editor,
I want a line at the current hour labelled "Now",
so that I can see where the day has got to.

```
AC1 — The line is in the hour that contains now
  Given group-by "hour", hourly points for 2026-11-05, and now "2026-11-05T14:23"
  When  the chart draws
  Then  the line is at the 2 PM date

AC2 — A UTC now is read in local time
  Given group-by "hour", hourly points for 2026-11-05, and now "2026-11-05T13:23:00Z"
  When  the chart draws
  Then  the line is at the 2 PM date

AC3 — "Now" at hour level
  Given group-by "hour" and a now inside the dates
  When  the chart draws
  Then  the label over the line is "Now"

AC4 — "Today" at day level
  Given group-by "day" and now "2026-11-05"
  When  the chart draws
  Then  the label over the line is "Today"

AC5 — The tooltip names the now hour
  Given group-by "hour" and now "2026-11-05T14:23"
  When  the tooltip shows the 2 PM bar
  Then  its heading is "Nov 5, 2026, 2 PM (now)"

AC6 — The hidden table names the now hour
  Given group-by "hour" and now "2026-11-05T14:23"
  When  the hidden table renders
  Then  the 2 PM row is "Nov 5, 2026, 2 PM (now)"

AC7 — A UTC now at day level is the local day
  Given group-by "day", daily points, and now "2026-11-04T23:30:00Z" (00:30 on 5 Nov local)
  When  the chart draws
  Then  the line is at "2026-11-05"

Sad path

AC8 — Now outside the dates
  Given group-by "hour", hourly points for 2026-11-04, and now "2026-11-05T14:23"
  When  the chart draws
  Then  no line is drawn

AC9 — today is gone
  Given the chart element
  When  its properties are read
  Then  it has no today property
```

## HRS-5: Incomplete hours

As an editor,
I want the hours still to come faded and hatched,
so that a low current hour doesn't read as a drop.

```
AC1 — From the hour that contains incomplete-from
  Given group-by "hour", hourly points for 2026-11-05, and incomplete-from "2026-11-05T14:23"
  When  the hidden table renders
  Then  the 2 PM row is the first one named "(incomplete)"

AC2 — Now and incomplete together
  Given group-by "hour", now and incomplete-from both "2026-11-05T14:23"
  When  the hidden table renders
  Then  the 2 PM row is "Nov 5, 2026, 2 PM (now, incomplete)"

Sad path

AC3 — A plain date means from midnight
  Given group-by "hour", hourly points for 2026-11-05, and incomplete-from "2026-11-05"
  When  the hidden table renders
  Then  the 12 AM row is the first one named "(incomplete)"
```

## HRS-6: Hour labels

As an editor,
I want hour labels I can read at a glance in my own language,
so that I can find a time on the chart quickly.

```
AC1 — Every 3 hours on one day
  Given group-by "hour" and 24 hourly dates for 2026-11-05
  When  the chart draws
  Then  the x-axis labels are "Thu, Nov 5", "3 AM", "6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM" (midnight shows the date)

AC2 — Every 6 hours on two days
  Given group-by "hour" and 48 hourly dates for 2026-11-04 and 2026-11-05
  When  the chart draws
  Then  8 labels are shown, 6 hours apart

AC3 — Each day's first hour shows the date
  Given group-by "hour" and 48 hourly dates for 2026-11-04 and 2026-11-05
  When  the chart draws
  Then  the labels at the two midnights are "Wed, Nov 4" and "Thu, Nov 5"

AC4 — The tooltip shows date and hour
  Given group-by "hour" and a point at 1 PM on 2026-11-05
  When  the tooltip shows its bar
  Then  its heading is "Nov 5, 2026, 1 PM"

AC5 — In the editor's culture
  Given culture "da-DK", group-by "hour" and a point at 2 PM on 2026-11-05
  When  the hidden table renders
  Then  its row shows the hour as "14"

Sad path

AC6 — The repeated hour is labelled twice
  Given group-by "hour" and 25 hourly dates for 2026-10-25
  When  the hidden table renders
  Then  two rows show 2 AM

AC7 — The repeated hour's tooltips name the zone
  Given group-by "hour" and 25 hourly dates for 2026-10-25
  When  the tooltip shows the first and then the second 2 AM bar
  Then  their headings end in "2 AM GMT+2" and "2 AM GMT+1"
```

AC7's zone names are what `Intl` gives for `timeZoneName: "short"` in en-US. The spec's "CEST"/"CET" was an example.

## HRS-7: Group by hour

As an editor,
I want an Hour option when the range is short,
so that I can switch a short range to hourly bars.

```
AC1 — The Hour option
  Given uaui-group-by with options ["hour", "day"]
  When  it renders
  Then  the first option is labelled "Hour"

AC2 — The default options don't change
  Given uaui-group-by with no options set
  When  it renders
  Then  its options are Day, Week and Month

AC3 — A short range offers hour and day
  Given the range 2026-11-04 to 2026-11-05
  When  I call uauiGroupByOptions(range)
  Then  it returns ["hour", "day"]

AC4 — A longer range offers day, week and month
  Given the range 2026-11-03 to 2026-11-05
  When  I call uauiGroupByOptions(range)
  Then  it returns ["day", "week", "month"]

AC5 — The hour change event
  Given uaui-group-by with options ["hour", "day"] and value "day"
  When  the editor picks Hour
  Then  a change event fires with detail { value: "hour" }

Sad path

AC6 — An invalid range
  Given the range 2026-11-05 to 2026-11-04
  When  I call uauiGroupByOptions(range)
  Then  it returns ["day", "week", "month"]
```

## HRS-8: Today and Yesterday presets

As an editor,
I want Today and Yesterday in the date range list,
so that I can jump to a short range in one click.

```
AC1 — Today's dates
  Given today "2026-11-05"
  When  I call uauiPresetRange("today", today)
  Then  it returns 2026-11-05 to 2026-11-05

AC2 — Yesterday's dates
  Given today "2026-11-05"
  When  I call uauiPresetRange("yesterday", today)
  Then  it returns 2026-11-04 to 2026-11-04

AC3 — Labelled by the package
  Given a product passes presets [{ id: "today" }, { id: "yesterday" }]
  When  the date range dialog opens
  Then  the preset list shows "Today" and "Yesterday"

AC4 — Picking Today
  Given the dialog with the today preset and today "2026-11-05"
  When  the editor picks Today
  Then  the from and to fields both show 2026-11-05

AC5 — Previous period for Today is yesterday
  Given the range 2026-11-05 to 2026-11-05
  When  I call uauiCompareFor("previous-period", range)
  Then  it returns 2026-11-04 to 2026-11-04

Sad path

AC6 — Not in the defaults
  Given a date range with no presets set
  When  the dialog opens
  Then  the list has no Today or Yesterday

AC7 — Yesterday across a month
  Given today "2026-12-01"
  When  I call uauiPresetRange("yesterday", today)
  Then  it returns 2026-11-30 to 2026-11-30
```

## HRS-9: A one-day range reads as one date

As an editor,
I want a one-day range shown as one date,
so that "Today" doesn't read as "Nov 5, 2026 to Nov 5, 2026".

```
AC1 — The helper
  Given the range 2026-11-05 to 2026-11-05
  When  I call uauiFormatDateRange(localize, range)
  Then  it returns "Nov 5, 2026"

AC2 — The button
  Given uaui-date-range with the value 2026-11-05 to 2026-11-05
  When  it renders
  Then  the button shows "Nov 5, 2026"

Sad path

AC3 — Two days still read as a range
  Given the range 2026-11-04 to 2026-11-05
  When  I call uauiFormatDateRange(localize, range)
  Then  it returns "Nov 4, 2026 to Nov 5, 2026"
```

## HRS-10: AI usage example shows Today by hour

As a product developer,
I want the AI usage example to show Today by hour,
so that I have a working pattern to copy into my product.

```
AC1 — Today by hour
  Given the AI usage example page
  When  the editor picks Today and then Hour
  Then  the chart has group-by "hour" and 24 dates

AC2 — Back to a long range
  Given the AI usage example on Today by hour
  When  the editor picks Last 30 days
  Then  the chart's group-by is "day"
```
