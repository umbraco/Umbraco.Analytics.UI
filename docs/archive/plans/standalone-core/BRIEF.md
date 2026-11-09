# Brief: Standalone core package

The Umbraco Cloud portal team wants our analytics components for their own charts, but the portal isn't an Umbraco site. Today every component needs the Umbraco backoffice on the page, so they can't use them. This splits out a core npm package that works on any page with Lit and UUI, while Engage, Commerce and Umbraco AI keep using the Umbraco package as today.

> [!IMPORTANT]
> **4 guesses and 4 open questions need you.**
>
> 1. Engage, Commerce and Umbraco AI see no change: same element names, attributes, events and imports from `@umbraco/analytics-ui`.\
>    *If not:* each product needs code changes, and the split becomes a breaking change.
> 2. It lands before 19.0.0 final. 26 public components show Umbraco's base element in their public types, so moving them to a plain base changes the public API, which is only allowed at a CMS major.\
>    *If not:* the split waits for v20, or keeps those types and gives Cloud something narrower.
> 3. The core holds every component, not only the ones Cloud asks for.\
>    *If not:* only some components move, and the rest stay Umbraco only.
> 4. One Storybook documents both packages.\
>    *If not:* a second Storybook to build and host.
> 5. **Open:** which UUI and Lit versions does the Cloud portal use today, and can it move to the ones each CMS major ships?\
>    *Options:* already matches; can move before adopting; can't move (blocks the plan).
> 6. **Open:** how does the portal translate text and pick the user's language?\
>    *Options:* its own system we plug into; English only for now; something else.
> 7. **Open:** does the portal render web components inside another framework (React, Vue, Angular), or plain Lit?\
>    *Options:* plain Lit; inside a framework (they may need wrappers or typings).
> 8. **Open:** which components does Cloud need first?\
>    *Options:* charts only; charts plus KPI tiles and date range; everything.

## Why now
- The Umbraco Cloud portal team asked for it, for their own analytics charts.
- Nothing is released yet (19.0.0 is still alpha), so public types can still change.

## Done when
- The Cloud portal installs one npm package and shows our charts with no Umbraco backoffice on the page.
- The core package brings its own Chart.js, so the portal doesn't install it separately.
- The portal can show text in its own languages and number and date formats in the user's culture.
- Light and dark mode work in the portal, using UUI's colours.
- Engage, Commerce and Umbraco AI keep working on a site with no code changes (see guess 1).
- A site still loads one copy of Lit, UUI and Chart.js.
- Both packages ship from this repo in the same release, with the same version number.

## Must work with
- Package major = CMS major for both packages. Cloud follows the CMS's UUI and Lit versions for that major.
- Umbraco CMS 19 for the Umbraco package.
- The current release process: NuGet, npm, import map, one changelog.

## Unknowns
- Whether the date range picker's dialog can work without the backoffice's popup manager and still look and behave the same inside Umbraco.
- Whether the core can stay free of `@umbraco-cms/backoffice` without a second copy of Lit or UUI loading on Umbraco sites.
- How much of `UmbLitElement` our components rely on (translation, context, observing), and what replaces each part in the core.

## Not doing
- **A separate version line for the core.** One version line is simpler, and Umbraco sites come first. Cloud aligns to the CMS.
