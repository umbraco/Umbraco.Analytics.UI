import { css } from "@umbraco-cms/backoffice/external/lit";

/**
 * The key swatches of the funnel's legend and tooltip, small copies of what the funnel draws: `.swatch` is a bar, and
 * `.swatch.swatch-compare` a neutral bar with a compare tick at each end, poking out above and below like the brackets.
 * Symmetric, so it needs no RTL rules. Mark the swatch `aria-hidden`. Internal: not exported.
 */
export const UauiFunnelSwatchStyles = css`
    .swatch {
        position: relative;
        flex: none;
        width: 14px;
        height: 6px;
        border-radius: 1px;
        background: var(--uaui-color-bar-1);
    }

    .swatch-compare {
        border-radius: 0;
        background: var(--uaui-color-tint-neutral);
    }

    .swatch-compare::before,
    .swatch-compare::after {
        content: "";
        position: absolute;
        top: -3px;
        bottom: -3px;
        width: 2px;
        background: var(--uaui-color-compare);
    }

    .swatch-compare::before {
        inset-inline-start: 0;
    }

    .swatch-compare::after {
        inset-inline-end: 0;
    }
`;
