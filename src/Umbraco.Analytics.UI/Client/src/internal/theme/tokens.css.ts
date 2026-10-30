import { css } from "@umbraco-cms/backoffice/external/lit";

/**
 * Series, comparison and tint tokens. Every element adds this to its `styles`.
 *
 * A product overrides a token by setting the public name (`--uax-series-1`) on any ancestor.
 * Declaring `--uax-series-1` on `:host` would shadow that inherited value, so the public names
 * are never declared here. Instead each element resolves its token into a private `--_uax-*`
 * name: the ancestor's value if there is one, else the UUI default. Elements read the private name.
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
 * | series-4   | violet-blue 9.80           | jungle-green 5.58             |
 * | compare    | chamoisee 3.71             | deep-saffron 5.92             |
 *
 * Replaced because they fail 3:1: space-cadet (1.15 dark), violet-blue (1.30 dark), spanish-pink
 * (1.17 light), sunglow (1.43 light), deep-saffron (2.15 light; no orange shade passes on white).
 *
 * Fills (areas) use `--_uax-fill-N` at low alpha, not the line colour: the line
 * tokens are darker so lines clear 3:1, and a pale tint of them looks grey. In light, fill 1 is the
 * design's violet blue, fill 3 is sunglow, and fill 4 is malibu so it differs from fill 1; fills 2 and
 * the dark shades match their lines. A product that overrides `--uax-series-N` gets that colour as the fill.
 * Fills are decoration (the line or bar edge carries the series), so they have no contrast target.
 *
 * Bars use `--_uax-bar-N`, opaque and livelier than the line shades. Light is the design's violet-blue,
 * maroon-flush-light, sunglow and malibu; dark keeps the dark line shades. A product's `--uax-bar-N`
 * wins, then its `--uax-series-N`. A bar is a large fill that the legend and the hidden table also name,
 * so it needn't reach 3:1.
 *
 * | token      | light (on #fff)            | dark (on #2d333b)             |
 * | ---------- | -------------------------- | ----------------------------- |
 * | bar-1      | violet-blue 9.80           | malibu-light 4.44             |
 * | bar-2      | maroon-flush-light 4.18    | maroon-flush-light 3.05       |
 * | bar-3      | sunglow 1.43               | sunglow 8.94                  |
 * | bar-4      | malibu 3.93                | jungle-green 5.58             |
 *
 * The compare bar sits behind the current bars: `--_uax-compare` at 45% over the surface (chamoisee
 * 1.68:1 light, deep-saffron 2.34:1 dark). It is decoration too: the legend, tooltip and table carry it.
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
 *
 * The tints themselves are decoration (the sign, arrow and hidden text carry the meaning), so they
 * stay faint: 1.2 to 1.3:1 against the surface in light and high contrast, 1.1 in dark.
 */
export const uaxThemeTokens = css`
    :host {
        color-scheme: var(--uui-color-scheme, normal);

        --_uax-series-1: var(
            --uax-series-1,
            light-dark(var(--uui-palette-space-cadet), var(--uui-palette-malibu-light))
        );
        --_uax-series-2: var(
            --uax-series-2,
            light-dark(var(--uui-palette-maroon-flush), var(--uui-palette-maroon-flush-light))
        );
        --_uax-series-3: var(
            --uax-series-3,
            light-dark(var(--uui-palette-sunglow-dark), var(--uui-palette-sunglow))
        );
        --_uax-series-4: var(
            --uax-series-4,
            light-dark(var(--uui-palette-violet-blue), var(--uui-palette-jungle-green))
        );
        --_uax-fill-1: var(
            --uax-series-1,
            light-dark(var(--uui-palette-violet-blue), var(--uui-palette-malibu-light))
        );
        --_uax-fill-2: var(
            --uax-series-2,
            light-dark(var(--uui-palette-maroon-flush), var(--uui-palette-maroon-flush-light))
        );
        --_uax-fill-3: var(--uax-series-3, var(--uui-palette-sunglow));
        --_uax-fill-4: var(
            --uax-series-4,
            light-dark(var(--uui-palette-malibu), var(--uui-palette-jungle-green))
        );
        --_uax-bar-1: var(
            --uax-bar-1,
            var(--uax-series-1, light-dark(var(--uui-palette-violet-blue), var(--uui-palette-malibu-light)))
        );
        --_uax-bar-2: var(
            --uax-bar-2,
            var(--uax-series-2, var(--uui-palette-maroon-flush-light))
        );
        --_uax-bar-3: var(--uax-bar-3, var(--uax-series-3, var(--uui-palette-sunglow)));
        --_uax-bar-4: var(
            --uax-bar-4,
            var(--uax-series-4, light-dark(var(--uui-palette-malibu), var(--uui-palette-jungle-green)))
        );
        --_uax-compare: var(
            --uax-compare,
            light-dark(var(--uui-palette-chamoisee), var(--uui-palette-deep-saffron))
        );
        --_uax-compare-bar: color-mix(in srgb, var(--_uax-compare) 45%, transparent);

        --_uax-gap-positive: var(
            --uax-gap-positive,
            light-dark(
                color-mix(in srgb, var(--uui-color-positive) 15%, transparent),
                color-mix(in srgb, var(--uui-palette-jungle-green) 25%, transparent)
            )
        );
        --_uax-gap-negative: var(
            --uax-gap-negative,
            light-dark(
                color-mix(in srgb, var(--uui-color-danger) 15%, transparent),
                color-mix(in srgb, var(--uui-palette-maroon-flush) 40%, transparent)
            )
        );

        --_uax-text-positive: var(
            --uax-text-positive,
            light-dark(var(--uui-palette-forest-green-dark), var(--uui-palette-jungle-green))
        );
        --_uax-text-negative: var(
            --uax-text-negative,
            light-dark(var(--uui-palette-maroon-flush-dark), var(--uui-palette-spanish-pink))
        );
        --_uax-text-neutral: var(--uax-text-neutral, var(--uui-color-text-alt));

        --_uax-tint-positive: var(--uax-tint-positive, color-mix(in srgb, var(--uui-color-positive) 15%, transparent));
        --_uax-tint-negative: var(--uax-tint-negative, color-mix(in srgb, var(--uui-color-danger) 15%, transparent));
        --_uax-tint-neutral: var(--uax-tint-neutral, color-mix(in srgb, var(--uui-color-text) 20%, transparent));
    }
`;
