# Funnel design

Reference for `uaui-funnel` (SPEC.md §10). Made 31-10-2026 from the "C2" boards on the design canvas, with made-up numbers: Engage at 360px (beside its chart) and Commerce at 560px (its own box).

| File | Shows |
|---|---|
| [`funnel.png`](funnel.png) | No comparison. |
| [`funnel-compare.png`](funnel-compare.png) | Comparing with last period: brackets, point badges on the links, legend. |
| [`funnel-compare-tooltip.png`](funnel-compare-tooltip.png) | The tooltip on a hovered or focused step. |
| [`funnel-compare-dark.png`](funnel-compare-dark.png) | Comparing, dark theme. |

The headers' "Overall" figure is the product's `uaui-stat` (`layout="inline"`) in the `uui-box` header, not part of the funnel. The dark colours are close to UUI's dark theme but not taken from it; the element uses the package's tokens.
