# @umbraco-analytics/ui

TypeScript types for Umbraco Analytics UI: shared backoffice charts, tables, KPI tiles and filters used by the analytics sections of Umbraco products.

> This npm package contains **types only**. The components themselves ship in the `Umbraco.Analytics.UI` NuGet package, which registers `@umbraco-analytics/ui` in the backoffice import map so every product on a site shares one copy.

## Using it in a backoffice extension

1. Reference the NuGet package from your package's project, with a range covering one CMS major:

   ```xml
   <PackageReference Include="Umbraco.Analytics.UI" Version="[19.0.0, 20.0.0)" />
   ```

2. Add the types as a dev dependency:

   ```bash
   npm install -D @umbraco-analytics/ui
   ```

3. Mark it as external in your bundler, so you use the backoffice's copy instead of bundling your own. For Vite:

   ```ts
   rollupOptions: {
     external: [/^@umbraco-cms\//, /^@umbraco-analytics\//],
   }
   ```

4. Import and use the components:

   ```ts
   import "@umbraco-analytics/ui";

   html`<uax-delta-badge .value=${12.4}></uax-delta-badge>`;
   ```

## Using the palette in your own elements

Our elements read their colours from `--uax-*` custom properties. To colour your own cell, legend or chart key the same way, add `UaxPaletteStyles` to the element's styles and read the resolved name:

```ts
import { css, html, LitElement } from "@umbraco-cms/backoffice/external/lit";
import { UaxPaletteStyles } from "@umbraco-analytics/ui";

class MyLegend extends LitElement {
  render() {
    return html`<span class="dot"></span>`;
  }

  static styles = [
    UaxPaletteStyles,
    css`
      .dot {
        background-color: var(--uax-color-series-1);
      }
    `,
  ];
}
```

The colour is the one our share bars use, in the light, dark and high contrast themes.

| Read this | For | Override it with |
| --- | --- | --- |
| `--uax-color-series-1` to `--uax-color-series-4` | lines and bars | `--uax-series-1` to `--uax-series-4` |
| `--uax-color-fill-1` to `--uax-color-fill-4` | area fills (use at low opacity) | `--uax-series-N` |
| `--uax-color-bar-1` to `--uax-color-bar-4` | livelier bars | `--uax-bar-N`, then `--uax-series-N` |
| `--uax-color-compare` | the compare period | `--uax-compare` |
| `--uax-color-compare-bar` | the compare bar (45% of compare) | `--uax-compare` |
| `--uax-color-marker`, `--uax-color-marker-hover` | chart markers | `--uax-marker` |
| `--uax-color-gap-positive`, `--uax-color-gap-negative` | shading between a series and its compare line | `--uax-gap-positive`, `--uax-gap-negative` |
| `--uax-color-tint-positive`, `-negative`, `-neutral` | pill and track backgrounds | `--uax-tint-*` |
| `--uax-color-text-positive`, `-negative`, `-neutral` | text on those tints | `--uax-text-*` |

Notes:

- `--uax-color-*` are read-only. Override with `--uax-*` only; setting `--uax-color-*` is unsupported.
- To override, set `--uax-*` (for example `--uax-series-1: #0a7`) on an ancestor, so it reaches both your elements and ours. Setting it on your own `:host` only changes your element.
- The block sets `color-scheme` on the element's `:host`. Its subtree inherits it, slotted children included, which aligns native controls and scrollbars with the UUI theme. With no UUI theme it resets to `normal`.
- The palette is tested to 3:1 for lines and bars in all three themes. If you override a colour, you own its contrast.

## Versioning

The package major matches the Umbraco CMS major. Minor and patch releases never break the public API: element names, attributes, events and types.
