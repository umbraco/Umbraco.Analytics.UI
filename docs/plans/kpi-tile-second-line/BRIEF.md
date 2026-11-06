# Brief: KPI tile second line

A KPI tile shows one figure, but some figures need a small part of the total beside them, such as "134.8K input tokens, 114.3K of them cached". Product developers can only cram both into one string, which isn't formatted for the editor's language, crowds narrow tiles, and reads to screen readers as one number. Tracked in [#41](https://github.com/umbraco/Umbraco.Analytics.UI/issues/41).

## Why now
- Umbraco AI's usage dashboard needs it for its Input tokens tile (total and cached), as it moves onto this library for v19.
- Nothing is released yet, so the names can still be chosen freely.

## Done when
- A product sets a number and a pattern like `"{0} cached"`, and the tile shows "114.3K cached" under the value, in a smaller, quieter style.
- The number is formatted in the editor's language, the same way the value is, unless the product gives it its own format.
- When the value is shown short ("1.2M"), the line is shown short too, so the two never mix short and full numbers. Numbers still only shorten on their own from 1,000,000 up; a product that wants "114.3K" asks for short format, and the line follows.
- A pattern with no `{0}` is a plain note (such as "estimated") and shows even with no number. A pattern with `{0}` needs the number, or the line is hidden.
- The line hides when the tile shows an error or "no data", like the change badge does.
- Tiles without the line keep their current height, so existing dashboards look the same.
- The pattern's word order is the product's, so it reads right in every language.
- The line works with the change badge, on wide and narrow tiles.
- Screen readers hear the value, then the line, as part of the tile's name.
- While loading, the tile shows a placeholder the size of a loaded tile with the line.
- Light, dark and high contrast all pass contrast checks, and the axe check passes.

## Must work with
- Umbraco CMS 19 (package major 19).
- One version shared by every product on a site, so the new names are public API for good.
- Selectable, link and openable tiles, and every layout the tile has today.

## Unknowns
- Whether the line fits on narrow tiles (under 240px) beside or under the badge without the row of tiles jumping on load.
- Whether `{0}` in a product's own Umbraco translation survives `localize.term()` when the product passes no arguments, or the product needs another way to get the raw pattern.

## Not doing
- **The line on `uaui-stat`.** Only the KPI tile needs it now. `uaui-stat` may want it later, as a follow-up.
- **A lower threshold for shortening numbers.** Tiles on every dashboard would change; a product asks for short format instead.
- **Changing the change badge.** The line sits with it, the badge itself stays as is.
