import { css, type CSSResult } from "@umbraco-cms/backoffice/external/lit";

/*
 * Series, comparison and tint tokens. Every element adds this to its `styles`, and so can a product's
 * own element (public as `UauiPaletteStyles`), so its cells and legends resolve the same colours as ours.
 * UUI ships its tokens as `:root` stylesheets that the backoffice swaps per theme; a package can't add
 * to those, and `light-dark()` on `:root` would need `color-scheme` set page-wide, so the palette
 * is a block of styles instead, which works in any shadow root with no global CSS.
 *
 * A product reads `var(--uaui-color-series-1)` and the other `--uaui-color-*` names below in its own CSS. Its
 * `--uaui-*` overrides still win, since they are read from the ancestors as before.
 *
 * A product overrides a token by setting the public name (`--uaui-series-1`) on any ancestor.
 * Declaring `--uaui-series-1` on `:host` would shadow that inherited value, so the public names
 * are never declared here. Instead each element resolves its token into a read name, `--uaui-color-*`:
 * the ancestor's value if there is one, else the UUI default. Elements read that `--uaui-color-*` name.
 *
 * The UUI palette is the same in every theme, so each default is `light-dark(<light>, <dark>)`.
 * The UUI dark theme sets the custom property `--uui-color-scheme: dark`, not `color-scheme`
 * itself, so `:host` copies it into `color-scheme` (as UUI's own inputs do). Light and high
 * contrast don't set it, so they take the first value. Lines and bars need 3:1 against `--uui-color-surface` (#fff light and high
 * contrast, #2d333b dark). The design's colour is kept where it reaches that.
 *
 * | token      | light (on #fff)            | dark (on #2d333b)             |
 * | ---------- | -------------------------- | ----------------------------- |
 * | series-1   | space-cadet 14.62          | malibu-light 4.44             |
 * | series-2   | maroon-flush 4.54          | maroon-flush-light 3.05       |
 * | series-3   | sunglow-dark 4.07          | sunglow 8.94                  |
 * | series-4   | violet-blue 9.80           | lavender 5.62                 |
 * | compare    | chamoisee 3.71             | deep-saffron 5.92             |
 *
 * Replaced because they fail 3:1: space-cadet (1.15 dark), violet-blue (1.30 dark), spanish-pink
 * (1.17 light), sunglow (1.43 light), deep-saffron (2.15 light; no orange shade passes on white).
 *
 * Lavender (dark series 4) is `color-mix(in srgb, violet-blue-light 45%, white)`: the palette's violets all fail
 * 3:1 on the dark surface, and its greens read as the positive status (jungle-green, the old series 4, was 1.56:1
 * against forest-green-light). It is paler than series 1's malibu-light, so the two still differ.
 *
 * Slots 5 to 8 (teal, orchid, coral, olive) are for charts with many series, such as one per source page. The UUI
 * palette has no teal, purple or olive, so each is a `color-mix()` of two palette shades, as lavender is. They are
 * picked to clear 3:1 and to stay apart from slots 1 to 4, the status colours and the compare colour: the nearest of
 * those is at least 26 CIELAB (CIE76) apart in light and 30 in dark (T64 asked for 30 against a slot it replaced).
 * Their fills and bars are the line colour. Past 8 series the slots repeat.
 *
 * | token      | light (on #fff)                                  | dark (on #2d333b)                                        |
 * | ---------- | ------------------------------------------------ | -------------------------------------------------------- |
 * | series-5   | teal: forest-green 70% + malibu 4.77             | teal: jungle-green-light 60% + malibu-light 5.53         |
 * | series-6   | orchid: maroon-flush 60% + violet-blue-light 6.76| orchid: malibu-light 60% + maroon-flush-light 3.12       |
 * | series-7   | coral: sunglow-dark 50% + maroon-flush 4.73      | coral: deep-saffron-light 60% + maroon-flush 4.73        |
 * | series-8   | olive: sunglow-dark 70% + jungle-green-dark 3.83 | olive: deep-saffron 60% + forest-green 3.94              |
 *
 * Fills (areas) use `--uaui-color-fill-N` at low alpha, not the line colour: the line
 * tokens are darker so lines clear 3:1, and a pale tint of them looks grey. In light, fill 1 is the
 * design's violet blue, fill 3 is sunglow, and fill 4 is malibu so it differs from fill 1; fills 2 and
 * the dark shades match their lines. A product that overrides `--uaui-series-N` gets that colour as the fill.
 * Fills are decoration (the line or bar edge carries the series), so they have no contrast target.
 *
 * Bars use `--uaui-color-bar-N`, opaque and livelier than the line shades. Light is the design's violet-blue,
 * maroon-flush-light, sunglow and malibu; dark keeps the dark line shades. A product's `--uaui-bar-N`
 * wins, then its `--uaui-series-N`. A bar is a large fill that the legend and the hidden table also name,
 * so it needn't reach 3:1.
 *
 * | token      | light (on #fff)            | dark (on #2d333b)             |
 * | ---------- | -------------------------- | ----------------------------- |
 * | bar-1      | violet-blue 9.80           | malibu-light 4.44             |
 * | bar-2      | maroon-flush-light 4.18    | maroon-flush-light 3.05       |
 * | bar-3      | sunglow 1.43               | sunglow 8.94                  |
 * | bar-4      | malibu 3.93                | lavender 5.62                 |
 *
 * Status series (a series' `color` of `"default"`, `"positive"`, `"warning"` or `"danger"`, the status cell's names) use
 * `--uaui-color-series-<status>` for lines, `--uaui-color-fill-<status>` for areas and `--uaui-color-bar-<status>` for
 * bars, so a series can carry a meaning (errors in red). A product overrides them with `--uaui-series-<status>` and
 * `--uaui-bar-<status>`, as for the slots. Each is `light-dark()` of two palette shades; high contrast doesn't set
 * `--uui-color-scheme`, so it takes the light value. The lines are UUI's positive and danger colours in light. Warning
 * matches series 3 and danger series 2 (lines and bars, in every theme): the palette has no other yellow or red that
 * clears 3:1, so don't mix those slots with those statuses (the chart warns once if you do). Positive is forest green in
 * dark too, and series 4 is lavender there, not a green, so the two don't look alike. Default is a neutral grey, as the
 * status cell's default is.
 * Fills are the line colour, but warning's is sunglow (as fill 3). Bars follow the slot bars' rule (no 3:1 target).
 *
 * | token             | light (on #fff)            | dark (on #2d333b)             |
 * | ----------------- | -------------------------- | ----------------------------- |
 * | series-default    | dusty-grey-dark 3.32       | dusty-grey 4.58               |
 * | series-positive   | forest-green 4.91          | forest-green-light 3.57       |
 * | series-warning    | sunglow-dark 4.07          | sunglow 8.94                  |
 * | series-danger     | maroon-flush 4.54          | maroon-flush-light 3.05       |
 * | bar-default       | dusty-grey-dark 3.32       | dusty-grey 4.58               |
 * | bar-positive      | forest-green-light 3.57    | forest-green-light 3.57       |
 * | bar-warning       | sunglow 1.43               | sunglow 8.94                  |
 * | bar-danger        | maroon-flush-light 4.18    | maroon-flush-light 3.05       |
 *
 * The compare bar sits behind the current bars: `--uaui-color-compare` at 45% over the surface (chamoisee
 * 1.68:1 light, deep-saffron 2.34:1 dark). It is decoration too: the legend, tooltip and table carry it.
 *
 * Chart markers (the dot on the x-axis and its dashed line, drawn at 26% opacity) need 3:1 for the dot against the
 * surface. A product's `--uaui-marker` also replaces the hover shade: the bigger dot and stronger line still show
 * the state.
 *
 * | token         | light (on #fff)        | dark (on #2d333b)        |
 * | ------------- | ---------------------- | ------------------------ |
 * | marker        | space-cadet 14.62      | white 12.63              |
 * | marker-hover  | violet-blue 9.80       | malibu-light 4.44        |
 *
 * Compare gap (the shading between a series and its compare line): the light and high contrast value is
 * 15% of `--uui-color-positive` / `--uui-color-danger` (1.2 to 1.3:1 on white), which vanishes on the dark
 * surface (1.05:1). Dark uses 25% jungle-green (1.56:1 on #2d333b) and 40% maroon-flush (1.36:1). The
 * shading is decoration: the lines and the tooltip carry the values.
 *
 * Neutral tint: 20% of `--uui-color-text` over the surface gives a track of 1.59:1 (light and
 * high contrast) and 1.78:1 (dark). The old 40% of `--uui-color-divider` was 1.03:1 / 1.06:1.
 *
 * Text on a tint needs 4.5:1. The semantic tokens can't be used for it: high contrast redefines them
 * (its `--uui-color-positive-standalone` is 2.37:1 on its tint), and it doesn't set `--uui-color-scheme`
 * so it takes the light branch. The text colours are palette shades, which are the same in every
 * theme, picked so the light branch also clears 4.5:1 on the high contrast tints.
 *
 * | text on tint       | light                    | high contrast            | dark                       |
 * | ------------------ | ------------------------ | ------------------------ | -------------------------- |
 * | text-positive      | forest-green-dark 4.81   | forest-green-dark 4.84   | jungle-green 4.92          |
 * | text-negative      | maroon-flush-dark 5.46   | maroon-flush-dark 5.19   | spanish-pink 9.93          |
 * | text-neutral       | text-alt 8.86            | text-alt 8.86            | text-alt 6.14              |
 * | text-warning       | sunglow-dark 70% 6.61    | sunglow-dark 70% 6.61    | sunglow 7.07               |
 *
 * Warning (the status cell's `warning` color) has no palette shade that reaches 4.5:1 on a yellow tint in light
 * (sunglow-dark is about 3.8, chamoisee-dark 4.1), so its light text is sunglow-dark mixed 70% with black. Its tint
 * is 20% of `--uui-color-warning`, as sunglow at 15% hardly shows on white.
 *
 * The tints themselves are decoration (the sign, arrow and hidden text carry the meaning), so they
 * stay faint: 1.2 to 1.3:1 against the surface in light and high contrast, 1.1 in dark.
 */
/**
 * The package's colour palette as styles. Add it to your element's `static styles`, then read
 * `var(--uaui-color-series-1)` and the other `--uaui-color-*` names in your CSS: you get the colours our
 * elements use, in the light, dark and high contrast themes. The names are read-only. To change a colour,
 * set the matching `--uaui-*` name (for example `--uaui-series-1`) on an ancestor.
 */
export const UauiPaletteStyles: CSSResult = css`
    :host {
        color-scheme: var(--uui-color-scheme, normal);

        --uaui-color-series-1: var(
            --uaui-series-1,
            light-dark(var(--uui-palette-space-cadet), var(--uui-palette-malibu-light))
        );
        --uaui-color-series-2: var(
            --uaui-series-2,
            light-dark(var(--uui-palette-maroon-flush), var(--uui-palette-maroon-flush-light))
        );
        --uaui-color-series-3: var(
            --uaui-series-3,
            light-dark(var(--uui-palette-sunglow-dark), var(--uui-palette-sunglow))
        );
        --uaui-color-series-4: var(
            --uaui-series-4,
            light-dark(var(--uui-palette-violet-blue), color-mix(in srgb, var(--uui-palette-violet-blue-light) 45%, white))
        );
        --uaui-color-fill-1: var(
            --uaui-series-1,
            light-dark(var(--uui-palette-violet-blue), var(--uui-palette-malibu-light))
        );
        --uaui-color-fill-2: var(
            --uaui-series-2,
            light-dark(var(--uui-palette-maroon-flush), var(--uui-palette-maroon-flush-light))
        );
        --uaui-color-fill-3: var(--uaui-series-3, var(--uui-palette-sunglow));
        --uaui-color-fill-4: var(
            --uaui-series-4,
            light-dark(var(--uui-palette-malibu), color-mix(in srgb, var(--uui-palette-violet-blue-light) 45%, white))
        );
        --uaui-color-bar-1: var(
            --uaui-bar-1,
            var(--uaui-series-1, light-dark(var(--uui-palette-violet-blue), var(--uui-palette-malibu-light)))
        );
        --uaui-color-bar-2: var(
            --uaui-bar-2,
            var(--uaui-series-2, var(--uui-palette-maroon-flush-light))
        );
        --uaui-color-bar-3: var(--uaui-bar-3, var(--uaui-series-3, var(--uui-palette-sunglow)));
        --uaui-color-bar-4: var(
            --uaui-bar-4,
            var(--uaui-series-4, light-dark(var(--uui-palette-malibu), color-mix(in srgb, var(--uui-palette-violet-blue-light) 45%, white)))
        );
        --uaui-color-series-5: var(
            --uaui-series-5,
            light-dark(
                color-mix(in srgb, var(--uui-palette-forest-green) 70%, var(--uui-palette-malibu)),
                color-mix(in srgb, var(--uui-palette-jungle-green-light) 60%, var(--uui-palette-malibu-light))
            )
        );
        --uaui-color-series-6: var(
            --uaui-series-6,
            light-dark(
                color-mix(in srgb, var(--uui-palette-maroon-flush) 60%, var(--uui-palette-violet-blue-light)),
                color-mix(in srgb, var(--uui-palette-malibu-light) 60%, var(--uui-palette-maroon-flush-light))
            )
        );
        --uaui-color-series-7: var(
            --uaui-series-7,
            light-dark(
                color-mix(in srgb, var(--uui-palette-sunglow-dark) 50%, var(--uui-palette-maroon-flush)),
                color-mix(in srgb, var(--uui-palette-deep-saffron-light) 60%, var(--uui-palette-maroon-flush))
            )
        );
        --uaui-color-series-8: var(
            --uaui-series-8,
            light-dark(
                color-mix(in srgb, var(--uui-palette-sunglow-dark) 70%, var(--uui-palette-jungle-green-dark)),
                color-mix(in srgb, var(--uui-palette-deep-saffron) 60%, var(--uui-palette-forest-green))
            )
        );
        --uaui-color-fill-5: var(--uaui-color-series-5);
        --uaui-color-fill-6: var(--uaui-color-series-6);
        --uaui-color-fill-7: var(--uaui-color-series-7);
        --uaui-color-fill-8: var(--uaui-color-series-8);
        --uaui-color-bar-5: var(--uaui-bar-5, var(--uaui-color-series-5));
        --uaui-color-bar-6: var(--uaui-bar-6, var(--uaui-color-series-6));
        --uaui-color-bar-7: var(--uaui-bar-7, var(--uaui-color-series-7));
        --uaui-color-bar-8: var(--uaui-bar-8, var(--uaui-color-series-8));
        --uaui-color-series-default: var(
            --uaui-series-default,
            light-dark(var(--uui-palette-dusty-grey-dark), var(--uui-palette-dusty-grey))
        );
        --uaui-color-series-positive: var(
            --uaui-series-positive,
            light-dark(var(--uui-palette-forest-green), var(--uui-palette-forest-green-light))
        );
        --uaui-color-series-warning: var(
            --uaui-series-warning,
            light-dark(var(--uui-palette-sunglow-dark), var(--uui-palette-sunglow))
        );
        --uaui-color-series-danger: var(
            --uaui-series-danger,
            light-dark(var(--uui-palette-maroon-flush), var(--uui-palette-maroon-flush-light))
        );
        --uaui-color-fill-default: var(--uaui-color-series-default);
        --uaui-color-fill-positive: var(--uaui-color-series-positive);
        --uaui-color-fill-warning: var(--uaui-series-warning, var(--uui-palette-sunglow));
        --uaui-color-fill-danger: var(--uaui-color-series-danger);
        --uaui-color-bar-default: var(--uaui-bar-default, var(--uaui-color-series-default));
        --uaui-color-bar-positive: var(
            --uaui-bar-positive,
            var(--uaui-series-positive, var(--uui-palette-forest-green-light))
        );
        --uaui-color-bar-warning: var(--uaui-bar-warning, var(--uaui-series-warning, var(--uui-palette-sunglow)));
        --uaui-color-bar-danger: var(--uaui-bar-danger, var(--uaui-series-danger, var(--uui-palette-maroon-flush-light)));
        --uaui-color-compare: var(
            --uaui-compare,
            light-dark(var(--uui-palette-chamoisee), var(--uui-palette-deep-saffron))
        );
        --uaui-color-compare-bar: color-mix(in srgb, var(--uaui-color-compare) 45%, transparent);

        --uaui-color-marker: var(--uaui-marker, light-dark(var(--uui-palette-space-cadet), var(--uui-palette-white)));
        --uaui-color-marker-hover: var(
            --uaui-marker,
            light-dark(var(--uui-palette-violet-blue), var(--uui-palette-malibu-light))
        );

        --uaui-color-gap-positive: var(
            --uaui-gap-positive,
            light-dark(
                color-mix(in srgb, var(--uui-color-positive) 15%, transparent),
                color-mix(in srgb, var(--uui-palette-jungle-green) 25%, transparent)
            )
        );
        --uaui-color-gap-negative: var(
            --uaui-gap-negative,
            light-dark(
                color-mix(in srgb, var(--uui-color-danger) 15%, transparent),
                color-mix(in srgb, var(--uui-palette-maroon-flush) 40%, transparent)
            )
        );

        --uaui-color-text-positive: var(
            --uaui-text-positive,
            light-dark(var(--uui-palette-forest-green-dark), var(--uui-palette-jungle-green))
        );
        --uaui-color-text-negative: var(
            --uaui-text-negative,
            light-dark(var(--uui-palette-maroon-flush-dark), var(--uui-palette-spanish-pink))
        );
        --uaui-color-text-neutral: var(--uaui-text-neutral, var(--uui-color-text-alt));
        --uaui-color-text-warning: var(
            --uaui-text-warning,
            light-dark(color-mix(in srgb, var(--uui-palette-sunglow-dark) 70%, black), var(--uui-palette-sunglow))
        );

        --uaui-color-tint-positive: var(--uaui-tint-positive, color-mix(in srgb, var(--uui-color-positive) 15%, transparent));
        --uaui-color-tint-negative: var(--uaui-tint-negative, color-mix(in srgb, var(--uui-color-danger) 15%, transparent));
        --uaui-color-tint-neutral: var(--uaui-tint-neutral, color-mix(in srgb, var(--uui-color-text) 20%, transparent));
        --uaui-color-tint-warning: var(--uaui-tint-warning, color-mix(in srgb, var(--uui-color-warning) 20%, transparent));
    }
`;
