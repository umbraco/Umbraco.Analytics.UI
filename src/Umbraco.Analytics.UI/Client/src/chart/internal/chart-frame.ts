import { css, html, nothing, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import "../../empty-state/empty-state.element.js";
import "../../error-state/error-state.element.js";
import { getLoadingMode, isBusy } from "../../internal/loading/loading-mode.js";
import "../../internal/loading/loading-bar.element.js";
import "../../internal/loading/skeleton.element.js";
import { UauiPaletteStyles } from "../../theme/index.js";

/** What a chart element passes to `renderChartFrame`: its states, and its own parts of the plot. */
export interface UauiChartFrame {
    /** The figure's accessible name. */
    label: string;
    /** Whether any series has a point. */
    hasData: boolean;
    loading: boolean;
    error: boolean;
    errorHeadline?: string;
    errorDescription?: string;
    retryable: boolean;
    emptyHeadline?: string;
    emptyDescription?: string;
    /** The hover tooltip (or `nothing`), in the plot over the canvas. */
    tooltip: unknown;
    /** Rendered only while the plot shows: over the plot (the markers' buttons), the legend under it and the hidden table. */
    overlay?: () => unknown;
    legend: () => unknown;
    table: () => unknown;
}

/** The error state's `retry` stops at its shadow root, so the chart raises its own. Lit calls it with the chart as `this`. */
function onRetry(this: HTMLElement) {
    this.dispatchEvent(new Event("retry", { bubbles: true }));
}

/**
 * What every chart element draws around its plot, whatever its x-axis: the figure, the loading bar or skeleton, the
 * error and empty states (error wins over loading, and loading over empty), the plot with its canvas, and the hidden
 * probe `UauiChartController` reads colours from. Raises `retry` on the chart from the error state's Retry button.
 * Use with `UauiChartFrameStyles` and a `UauiChartController`.
 */
export function renderChartFrame(frame: UauiChartFrame): TemplateResult {
    const mode = getLoadingMode(frame.loading, frame.hasData, frame.error);
    const busy = isBusy(frame.loading, frame.error);
    const showPlot = frame.hasData && mode !== "skeleton" && !frame.error;
    return html`<div
            class="region"
            role="figure"
            aria-label=${frame.label}
            aria-busy=${busy ? "true" : "false"}>
            ${mode === "reload" ? html`<uaui-loading-bar></uaui-loading-bar>` : nothing}
            <div class="content">
            ${mode === "skeleton" ? html`<uaui-skeleton></uaui-skeleton>` : nothing}
            ${frame.error
                ? html`<div class="empty">
                      <uaui-error-state
                          .headline=${frame.errorHeadline}
                          .description=${frame.errorDescription}
                          .retryable=${frame.retryable}
                          @retry=${onRetry}></uaui-error-state>
                  </div>`
                : nothing}
            ${mode === "idle" && !frame.error && !frame.hasData
                ? html`<div class="empty">
                      <uaui-empty-state
                          .headline=${frame.emptyHeadline}
                          .description=${frame.emptyDescription}></uaui-empty-state>
                  </div>`
                : nothing}
            <!-- The plot stays in the DOM while hidden, so the chart is never rebuilt by a loading toggle. -->
            <div class="plot" ?hidden=${!showPlot}>
                <canvas aria-hidden="true"></canvas>
                ${frame.tooltip}
                ${showPlot && frame.overlay ? frame.overlay() : nothing}
            </div>
            ${showPlot ? frame.legend() : nothing} ${showPlot ? frame.table() : nothing}
            </div>
            <span class="probe" hidden></span>
        </div>`;
}

/** The styles `renderChartFrame` needs, with the palette. */
export const UauiChartFrameStyles: CSSResultGroup = [
    UauiPaletteStyles,
    css`
        :host {
            display: block;
            --_uaui-skeleton-height: var(--uaui-chart-height, 260px);
        }

        .region {
            position: relative;
        }

        /* The chart pads its own content, so the loading bar can span the full width at the top edge. */
        .content {
            padding: var(--uaui-chart-padding, var(--uui-size-space-4) var(--uui-size-space-6) 28px);
        }

        .plot {
            position: relative;
            height: var(--_uaui-skeleton-height);
        }

        .empty {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: var(--_uaui-skeleton-height);
        }

        uaui-empty-state,
        uaui-error-state {
            width: 100%;
        }
    `,
];
