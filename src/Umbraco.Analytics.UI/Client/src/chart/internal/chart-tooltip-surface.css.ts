import { css, type CSSResult } from "@umbraco-cms/backoffice/external/lit";
import { UaxPaletteStyles } from "../../theme/index.js";

/**
 * The dark box shared by the date tooltip and the marker tooltip: the host is the box, and the chart
 * positions it. Dark in every theme, so the series colours take their light-on-dark shade; it comes after
 * the palette, whose `color-scheme` it replaces.
 */
export const UaxChartTooltipSurface: CSSResult[] = [
    UaxPaletteStyles,
    css`
        :host {
            position: absolute;
            z-index: 2;
            display: block;
            box-sizing: border-box;
            min-width: 96px;
            max-width: 260px;
            padding: var(--uui-size-space-2) var(--uui-size-space-3);
            border: 1px solid color-mix(in srgb, var(--uui-palette-white) 18%, transparent);
            border-radius: var(--uui-border-radius);
            background: var(--uui-palette-space-cadet);
            box-shadow: var(--uui-shadow-depth-3);
            color: var(--uui-palette-white);
            color-scheme: dark;
            font-size: 12px;
            pointer-events: none;
        }

        .tooltip-date {
            margin-bottom: 2px;
            font-size: 11px;
            font-weight: 700;
            color: var(--uui-palette-spanish-pink);
        }
    `,
];
