import {
    css,
    customElement,
    html,
    nothing,
    property,
    repeat,
    state,
    type CSSResultGroup,
    type PropertyValues,
    type TemplateResult,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "../delta-badge/delta-badge.element.js";
import "../empty-state/empty-state.element.js";
import "../error-state/error-state.element.js";
import { getNumberFormat } from "../internal/format/number-format.js";
import { getLoadingMode, isBusy } from "../internal/loading/loading-mode.js";
import "../internal/loading/loading-bar.element.js";
import "../internal/loading/skeleton.element.js";
import { UauiPaletteStyles } from "../theme/index.js";
import { clampInside, placeTooltip } from "../chart/internal/place-tooltip.js";
import { buildFunnel, cleanValue, linkClipPath, type UauiFunnelRow } from "./internal/funnel-data.js";
import type { UauiFunnelTableRow } from "./internal/funnel-data-table.element.js";
import "./internal/funnel-data-table.element.js";
import "./internal/funnel-legend.element.js";
import type { UauiFunnelTooltipElement } from "./internal/funnel-tooltip.element.js";
import "./internal/funnel-tooltip.element.js";
import type { UauiFunnelStep } from "./types.js";

const PERCENT: Intl.NumberFormatOptions = { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 };

/** Bar widths of the first-load skeleton, as a % of the bar column, when the steps are not known yet. */
const skeletonWidth = (index: number) => Math.max(100 * 0.6 ** index, 12);

interface Derived {
    rows: UauiFunnelRow[];
    comparing: boolean;
    value: Intl.NumberFormat;
    percent: Intl.NumberFormat;
}

/**
 * Shows how many reached each step of a process (visitors, carts, orders) and how many moved on to the next, as
 * centred bars that narrow down the page. Each bar's width is its value against the largest value shown, so the shape
 * is honest; the link between two bars shows the share that moved on.
 *
 * Draws only: pass the steps in order in `steps`. Pass the same steps for another period in `compare-steps`
 * (matched by `id`) to draw a bracket at each compare value's width, a change badge (in percentage points) on each
 * link, and a legend. Hovering or focusing a step shows a tooltip with both values, the change, and the step's share of
 * the first and the previous step. The steps are one tab stop: Up and Down move between them, Escape hides the tooltip.
 * A visually hidden table holds the same figures for screen readers, plus how many dropped off at each step.
 * While `loading` is set it shows a skeleton on first load, or keeps the old funnel under a loading bar when
 * reloading. With no steps, or a first step of 0, it shows `uaui-empty-state`. While `error` is set it shows
 * `uaui-error-state` (error wins over loading, and loading over empty).
 * It draws no overall conversion: put that in the pane's header, e.g. `uaui-table-total` in the `uui-box`
 * `header-actions` slot.
 *
 * @element uaui-funnel
 * @fires retry - The Retry button of the error state was pressed (needs `retryable`). Bubbles, not composed.
 * @cssprop --uaui-funnel-padding - Padding around the funnel, as a CSS `padding` value. Defaults to `12px 18px 18px`. The loading bar ignores it and spans the full width at the top edge, so put the funnel in a `uui-box` with `--uui-box-default-padding: 0`.
 * @cssprop --uaui-bar-1 - Colour of the bars. Falls back to `--uaui-series-1`.
 * @cssprop --uaui-compare - Colour of the compare brackets.
 */
@customElement("uaui-funnel")
export class UauiFunnelElement extends UmbLitElement {
    /** The steps, in funnel order. */
    @property({ attribute: false })
    steps: UauiFunnelStep[] = [];

    /** The same steps for another period, matched to `steps` by `id`. A step with no match gets no bracket or badge. */
    @property({ attribute: false })
    compareSteps: UauiFunnelStep[] = [];

    /** Names this period in the legend and tooltip, e.g. "May 25, 2026 to Jun 23, 2026". Defaults to the translation of "This period". */
    @property({ type: String, attribute: "current-label" })
    currentLabel?: string;

    /** Names the compared period in the legend and tooltip. Defaults to the translation of "Comparison". */
    @property({ type: String, attribute: "compare-label" })
    compareLabel?: string;

    /** How the values are formatted, e.g. `{ maximumFractionDigits: 0 }`. Shares are always percents. */
    @property({ type: Object, attribute: "value-format" })
    valueFormat?: Intl.NumberFormatOptions;

    /** Shows a skeleton on first load, or a loading bar over the old funnel when reloading. */
    @property({ type: Boolean, reflect: true })
    loading = false;

    /** The load failed. Shows `uaui-error-state` in place of the funnel, and wins over `loading` and the empty state. */
    @property({ type: Boolean, reflect: true })
    error = false;

    /** Headline of the error state. Defaults to the translation of "Something went wrong". */
    @property({ type: String, attribute: "error-headline" })
    errorHeadline?: string;

    /** Description of the error state. Defaults to the translation of "The data could not be loaded.". */
    @property({ type: String, attribute: "error-description" })
    errorDescription?: string;

    /** Shows a Retry button in the error state. Pressing it raises `retry` on the funnel. */
    @property({ type: Boolean })
    retryable = false;

    /** Headline of the empty state. Defaults to the translation of "No data yet". */
    @property({ type: String, attribute: "empty-headline" })
    emptyHeadline?: string;

    /** Description of the empty state. Defaults to the translation of "Try a wider date range.". */
    @property({ type: String, attribute: "empty-description" })
    emptyDescription?: string;

    /** The step whose tooltip shows: hovered, or focused. */
    @state()
    private _active?: number;

    /** The step that takes focus when the editor tabs into the funnel (roving tabindex). */
    @state()
    private _focusIndex = 0;

    /** Escape hides the tooltip until another step is hovered or focused. */
    @state()
    private _dismissed = false;

    /** The step under the pointer, so focus leaving the list doesn't hide the tooltip of a step still hovered. */
    #hovered?: number;

    #derived?: Derived;
    #derivedFrom?: { steps: UauiFunnelStep[]; compareSteps: UauiFunnelStep[]; valueFormat?: Intl.NumberFormatOptions; lang: string };

    override connectedCallback() {
        super.connectedCallback();
        document.addEventListener("keydown", this.#onDocumentKeydown);
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener("keydown", this.#onDocumentKeydown);
        this.#clearTooltip();
    }

    #clearTooltip() {
        this._active = undefined;
        this._dismissed = false;
        this.#hovered = undefined;
    }

    /** WCAG 1.4.13: Escape hides the tooltip without moving the pointer or focus. */
    #onDocumentKeydown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && this._active !== undefined) this._dismissed = true;
    };

    protected override willUpdate(changed: PropertyValues<this>) {
        super.willUpdate(changed);
        // A tooltip for steps that have gone, or for a funnel that isn't drawn, must not come back later.
        if (changed.has("steps") || this.error || !this.#hasData) this.#clearTooltip();
        const next = { steps: this.steps, compareSteps: this.compareSteps, valueFormat: this.valueFormat, lang: this.localize.lang() };
        const prev = this.#derivedFrom;
        if (!prev || prev.steps !== next.steps || prev.compareSteps !== next.compareSteps || prev.valueFormat !== next.valueFormat || prev.lang !== next.lang) {
            this.#derivedFrom = next;
            const rows = buildFunnel(next.steps ?? [], next.compareSteps ?? []);
            this.#derived = {
                rows,
                comparing: rows.some((r) => r.compare !== undefined),
                value: getNumberFormat(next.lang, next.valueFormat),
                percent: getNumberFormat(next.lang, PERCENT),
            };
        }
        const count = this.#derived?.rows.length ?? 0;
        if (this._focusIndex >= count) this._focusIndex = Math.max(count - 1, 0);
        if (this._active !== undefined && this._active >= count) this._active = undefined;
    }

    protected override updated(changed: PropertyValues<this>) {
        super.updated(changed);
        if (this._active !== undefined && !this._dismissed) void this.#placeTooltip();
    }

    get #hasData() {
        return this.steps.length > 0 && cleanValue(this.steps[0].value) > 0;
    }

    get #labelText() {
        return this.currentLabel || this.localize.term("uauiAnalytics_funnelCurrentLabel");
    }

    get #compareText() {
        return this.compareLabel || this.localize.term("uauiAnalytics_chartComparisonLabel");
    }

    #formatShare(share: number | null) {
        return share === null ? undefined : this.#derived!.percent.format(share);
    }

    #stepElements() {
        return [...(this.shadowRoot?.querySelectorAll<HTMLElement>(".step") ?? [])];
    }

    #showStep(index: number) {
        this._dismissed = false;
        this._active = index;
    }

    #onStepFocus(index: number) {
        this._focusIndex = index;
        this.#showStep(index);
    }

    #onStepEnter(index: number) {
        this.#hovered = index;
        this.#showStep(index);
    }

    #onStepsFocusOut(e: FocusEvent) {
        const list = e.currentTarget as HTMLElement;
        // A step still under the pointer keeps its tooltip when focus leaves.
        if (!list.contains(e.relatedTarget as Node | null)) this._active = this.#hovered;
    }

    #onStepsLeave() {
        this.#hovered = undefined;
        // A focused step keeps its tooltip when the pointer leaves.
        const focused = this.shadowRoot?.activeElement as HTMLElement | null;
        this._active = focused?.classList.contains("step") ? this._focusIndex : undefined;
    }

    #onStepsKeydown(e: KeyboardEvent) {
        const count = this.#derived?.rows.length ?? 0;
        const moves: Record<string, number> = { ArrowDown: this._focusIndex + 1, ArrowUp: this._focusIndex - 1, Home: 0, End: count - 1 };
        if (!(e.key in moves)) return;
        e.preventDefault();
        const index = Math.min(Math.max(moves[e.key], 0), count - 1);
        this._focusIndex = index;
        this.#stepElements()[index]?.focus();
    }

    /**
     * Puts the tooltip under the active step's bar, centred on it, inside the whole funnel (legend and padding included).
     * Below when it fits, above when only that fits, else on the side with more room; then kept inside.
     */
    async #placeTooltip() {
        const tip = this.shadowRoot?.querySelector<UauiFunnelTooltipElement>("uaui-funnel-tooltip");
        const region = this.shadowRoot?.querySelector<HTMLElement>(".region");
        const step = this._active === undefined ? undefined : this.#stepElements()[this._active];
        const bar = step?.querySelector<HTMLElement>(".bar-cell");
        if (!tip || !region || !step || !bar) return;
        await placeTooltip(tip, ({ width, height }) => {
            if (!step.isConnected) return undefined;
            const box = region.getBoundingClientRect();
            const barBox = bar.getBoundingClientRect();
            const limit = region.clientHeight;
            const gap = 8;
            const below = barBox.bottom - box.top + gap;
            const above = barBox.top - box.top - gap - height;
            const roomBelow = limit - below;
            const roomAbove = above + height;
            const top = below + height <= limit ? below : above >= 0 ? above : roomBelow >= roomAbove ? below : above;
            return {
                left: clampInside(barBox.left - box.left + barBox.width / 2 - width / 2, width, region.clientWidth),
                top: clampInside(top, height, limit),
            };
        });
    }

    #renderLink(upper: UauiFunnelRow, row: UauiFunnelRow) {
        const comparing = this.#derived!.comparing;
        const change = row.rate !== null && row.compareRate !== null ? (row.rate - row.compareRate) * 100 : undefined;
        return html`<div class="link" aria-hidden="true">
            <span></span>
            <span class="link-cell">
                <span class="link-shape" style="clip-path: ${linkClipPath(upper.width, row.width)}"></span>
                <span class="link-text">
                    <span class="rate">${this.#formatShare(row.rate) ?? "–"}</span>
                    ${comparing && change !== undefined ? html`<uaui-delta-badge size="sm" unit="points" .value=${change}></uaui-delta-badge>` : nothing}
                </span>
            </span>
            <span></span>
        </div>`;
    }

    #renderStep(row: UauiFunnelRow, index: number) {
        const value = this.#derived!.value.format(row.value);
        return html`<div
            class="step"
            role="listitem"
            tabindex=${index === this._focusIndex ? 0 : -1}
            aria-label=${this.localize.term("uauiAnalytics_funnelStepName", row.label, value)}
            @mouseenter=${() => this.#onStepEnter(index)}
            @focus=${() => this.#onStepFocus(index)}>
            <span class="label">${row.label}</span>
            <span class="bar-cell">
                ${row.value > 0 ? html`<span class="bar" style="width: ${row.width}%"></span>` : nothing}
                ${!row.compareWidth ? nothing : html`<span class="bracket" style="width: ${row.compareWidth}%"></span>`}
            </span>
            <span class="value">${value}</span>
        </div>`;
    }

    #renderTooltip() {
        const index = this._active;
        if (index === undefined || this._dismissed) return nothing;
        const row = this.#derived!.rows[index];
        if (!row) return nothing;
        const format = this.#derived!.value;
        return html`<uaui-funnel-tooltip
            style="visibility:hidden"
            aria-hidden="true"
            .heading=${row.label}
            .value=${format.format(row.value)}
            .valueLabel=${this.#labelText}
            .compare=${row.compare === undefined ? undefined : format.format(row.compare)}
            .compareLabel=${this.#compareText}
            .firstLabel=${this.#derived!.rows[0]?.label ?? ""}
            .change=${row.compare === undefined ? undefined : { current: row.value, previous: row.compare }}
            .ofFirst=${index === 0 ? undefined : this.#formatShare(row.ofFirst)}
            .fromPrevious=${index === 0 ? undefined : (this.#formatShare(row.rate) ?? "–")}></uaui-funnel-tooltip>`;
    }

    #renderTable() {
        const { rows, comparing, value } = this.#derived!;
        // The first step has nothing before it, so its "from previous" cells stay blank; any other missing figure
        // reads as "No value", as the dash on the link does.
        const none = this.localize.term("uauiAnalytics_funnelNoValue");
        const count = (n: number | undefined) => (n === undefined ? none : value.format(n));
        const tableRows: UauiFunnelTableRow[] = rows.map((row, i) => {
            const previous = rows[i - 1];
            const after = (text: string) => (i === 0 ? "" : text);
            return {
                label: row.label,
                value: value.format(row.value),
                ofFirst: this.#formatShare(row.ofFirst) ?? none,
                fromPrevious: after(this.#formatShare(row.rate) ?? none),
                droppedOff: after(previous ? value.format(previous.value - row.value) : ""),
                compare: count(row.compare),
                compareFromPrevious: after(this.#formatShare(row.compareRate) ?? none),
                compareDroppedOff: after(
                    previous?.compare === undefined || row.compare === undefined ? none : value.format(previous.compare - row.compare),
                ),
            };
        });
        return html`<uaui-funnel-data-table .rows=${tableRows} .comparing=${comparing}></uaui-funnel-data-table>`;
    }

    #renderFunnel() {
        const { rows, comparing } = this.#derived!;
        return html`${comparing ? html`<uaui-funnel-legend .label=${this.#labelText} .compareLabel=${this.#compareText}></uaui-funnel-legend>` : nothing}
            <div class="funnel">
                <div
                    class="steps"
                    role="list"
                    @keydown=${this.#onStepsKeydown}
                    @focusout=${this.#onStepsFocusOut}
                    @mouseleave=${this.#onStepsLeave}>
                    ${repeat(
                        rows,
                        (row) => row.id,
                        (row, i) => html`${i > 0 ? this.#renderLink(rows[i - 1], row) : nothing}${this.#renderStep(row, i)}`,
                    )}
                </div>
            </div>
            ${this.#renderTooltip()} ${this.#renderTable()}`;
    }

    #renderSkeleton() {
        const count = this.steps.length || 4;
        return html`<div class="steps" aria-hidden="true">
            ${Array.from(
                { length: count },
                (_, i) => html`${i > 0 ? html`<div class="link"></div>` : nothing}
                    <div class="step">
                        <span></span>
                        <span class="bar-cell"><uaui-skeleton class="bar" style="width: ${skeletonWidth(i)}%"></uaui-skeleton></span>
                        <span></span>
                    </div>`,
            )}
        </div>`;
    }

    // The error state's `retry` stops at its shadow root, so the funnel raises its own.
    #onRetry() {
        this.dispatchEvent(new Event("retry", { bubbles: true }));
    }

    override render(): TemplateResult {
        const mode = getLoadingMode(this.loading, this.#hasData, this.error);
        const busy = isBusy(this.loading, this.error);
        return html`<div
            class="region"
            role="group"
            aria-label=${this.localize.term("uauiAnalytics_funnelAriaLabel")}
            aria-busy=${busy ? "true" : "false"}>
            ${mode === "reload" ? html`<uaui-loading-bar></uaui-loading-bar>` : nothing}
            <div class="content">
                ${this.error
                    ? html`<div class="empty">
                          <uaui-error-state
                              .headline=${this.errorHeadline}
                              .description=${this.errorDescription}
                              .retryable=${this.retryable}
                              @retry=${this.#onRetry}></uaui-error-state>
                      </div>`
                    : mode === "skeleton"
                      ? this.#renderSkeleton()
                      : this.#hasData
                        ? this.#renderFunnel()
                        : html`<div class="empty">
                              <uaui-empty-state .headline=${this.emptyHeadline} .description=${this.emptyDescription}></uaui-empty-state>
                          </div>`}
            </div>
        </div>`;
    }

    static override styles: CSSResultGroup = [
        UauiPaletteStyles,
        css`
            :host {
                display: block;
                font-size: 14px;
                color: var(--uui-color-text);
            }

            .region {
                position: relative;
            }

            .content {
                padding: var(--uaui-funnel-padding, var(--uui-size-space-4) var(--uui-size-space-5) var(--uui-size-space-5));
            }

            uaui-funnel-legend {
                margin-bottom: var(--uui-size-space-3);
            }

            /* One grid for every row, so the label, bar and value columns line up down the funnel. */
            .steps {
                display: grid;
                grid-template-columns: minmax(72px, 0.45fr) minmax(0, 1fr) auto;
                column-gap: var(--uui-size-space-4);
            }

            .step,
            .link {
                display: grid;
                grid-column: 1 / -1;
                grid-template-columns: subgrid;
                align-items: center;
            }

            .step {
                min-height: 32px;
                border-radius: var(--uui-border-radius);
                outline: none;
            }

            .step:focus-visible {
                outline: 2px solid var(--uui-color-focus);
                outline-offset: 2px;
            }

            .label {
                line-height: 18px;
                overflow-wrap: anywhere;
            }

            .value {
                font-weight: 700;
                line-height: 18px;
                text-align: end;
                white-space: nowrap;
                font-variant-numeric: tabular-nums;
            }

            .bar-cell {
                position: relative;
                height: 28px;
            }

            .bar,
            .bracket {
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
            }

            .bar {
                top: 0;
                bottom: 0;
                min-width: 2px;
                border-radius: 2px;
                background: var(--uaui-color-bar-1);
            }

            /* Last period's value: a line at each end of its width, poking out above and below the bar, with a hairline
               of the surface on both sides so it shows over the bar too. */
            .bracket {
                top: -5px;
                bottom: -5px;
                box-sizing: border-box;
                min-width: 6px;
                border-inline: 2px solid var(--uaui-color-compare);
                box-shadow:
                    -1px 0 0 var(--uui-color-surface),
                    1px 0 0 var(--uui-color-surface),
                    inset 1px 0 0 var(--uui-color-surface),
                    inset -1px 0 0 var(--uui-color-surface);
            }

            /* Room for the 18px rate line, the 5px a bracket pokes out above and below, and a clear gap on each side. */
            .link {
                height: 36px;
            }

            .link-cell {
                position: relative;
                height: 100%;
            }

            .link-shape {
                position: absolute;
                inset: 0;
                background: color-mix(in srgb, var(--uui-color-text) 7%, transparent);
            }

            .link-text {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: var(--uui-size-space-1);
                height: 100%;
                font-size: 12px;
                font-weight: 700;
                color: var(--uui-color-text-alt);
                font-variant-numeric: tabular-nums;
                white-space: nowrap;
            }

            /* The badge's own tint is only 4.5:1 on the plain surface, so it gets the surface behind it, not the link's tint. */
            .link-text uaui-delta-badge {
                border-radius: var(--uui-border-radius-1);
                background: var(--uui-color-surface);
            }

            .empty {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 160px;
            }

            uaui-empty-state,
            uaui-error-state {
                width: 100%;
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-funnel": UauiFunnelElement;
    }
}
