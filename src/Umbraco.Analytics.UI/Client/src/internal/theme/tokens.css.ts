import { css } from "@umbraco-cms/backoffice/external/lit";

/**
 * Series, comparison and tint tokens. Every element adds this to its `styles`.
 *
 * A product overrides a token by setting the public name (`--uan-series-1`) on any ancestor.
 * Declaring `--uan-series-1` on `:host` would shadow that inherited value, so the public names
 * are never declared here. Instead each element resolves its token into a private `--_uan-*`
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
 * | series-2   | maroon-flush 4.54          | spanish-pink 10.88            |
 * | series-3   | sunglow-dark 4.07          | sunglow 8.94                  |
 * | series-4   | violet-blue 9.80           | jungle-green 5.58             |
 * | compare    | chamoisee 3.71             | deep-saffron 5.92             |
 *
 * Replaced because they fail 3:1: space-cadet (1.15 dark), violet-blue (1.30 dark), spanish-pink
 * (1.17 light), sunglow (1.43 light), deep-saffron (2.15 light; no orange shade passes on white).
 *
 * Neutral tint: 20% of `--uui-color-text` over the surface gives a track of 1.59:1 (light and
 * high contrast) and 1.78:1 (dark). The old 40% of `--uui-color-divider` was 1.03:1 / 1.06:1.
 */
export const uanThemeTokens = css`
    :host {
        color-scheme: var(--uui-color-scheme, normal);

        --_uan-series-1: var(
            --uan-series-1,
            light-dark(var(--uui-palette-space-cadet), var(--uui-palette-malibu-light))
        );
        --_uan-series-2: var(
            --uan-series-2,
            light-dark(var(--uui-palette-maroon-flush), var(--uui-palette-spanish-pink))
        );
        --_uan-series-3: var(
            --uan-series-3,
            light-dark(var(--uui-palette-sunglow-dark), var(--uui-palette-sunglow))
        );
        --_uan-series-4: var(
            --uan-series-4,
            light-dark(var(--uui-palette-violet-blue), var(--uui-palette-jungle-green))
        );
        --_uan-compare: var(
            --uan-compare,
            light-dark(var(--uui-palette-chamoisee), var(--uui-palette-deep-saffron))
        );

        --_uan-tint-positive: var(--uan-tint-positive, color-mix(in srgb, var(--uui-color-positive) 15%, transparent));
        --_uan-tint-negative: var(--uan-tint-negative, color-mix(in srgb, var(--uui-color-danger) 15%, transparent));
        --_uan-tint-neutral: var(--uan-tint-neutral, color-mix(in srgb, var(--uui-color-text) 20%, transparent));
    }
`;
