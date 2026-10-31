import { css, customElement, html, nothing, property, repeat, state, type CSSResultGroup, type PropertyValues, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { dateOnly } from "../../internal/date/date-math.js";
import { formatIsoDate } from "../../internal/date/format-date.js";
import type { UauiMarker, UauiMarkerClickDetail } from "../types.js";
import "./chart-marker-tooltip.element.js";
import type { UauiChartMarkerTooltipElement } from "./chart-marker-tooltip.element.js";
import type { MarkerBucket } from "./marker-buckets.js";
import type { UauiMarkerPlacement } from "./markers-plugin.js";
import { clampInside, placeTooltip } from "./place-tooltip.js";

/** A tooltip lists this many markers of a crowded dot, then says how many more there are. */
const MAX_MARKERS_IN_TOOLTIP = 4;

/** What `active-change` carries. */
export interface UauiChartMarkersActiveDetail {
    /** The date index of the dot the pointer is over or the keyboard is on, or `undefined` when there is none. */
    index: number | undefined;
}

/**
 * The overlay over the plot of `uaui-time-series-chart` that makes each marker dot a button: one transparent button
 * per dot, in date order so the tab order follows the timeline, and the tooltip of the hovered or focused one.
 * Escape hides the tooltip without moving the pointer or focus (WCAG 1.4.13). The canvas draws the dots; this
 * element sits over the plot, takes no pointer events itself and has no size of its own. Internal: not exported.
 *
 * @element uaui-chart-markers
 * @fires active-change - The dot that shows a tooltip changed. Not bubbling. `detail` is `{ index }` (`UauiChartMarkersActiveDetail`), `undefined` for none.
 * @fires marker-click - A dot was clicked, or Enter or Space was pressed on it. Not bubbling. `detail` is `{ id }` of the earliest marker of the dot.
 */
@customElement("uaui-chart-markers")
export class UauiChartMarkersElement extends UmbLitElement {
    /** The markers grouped per dot. */
    @property({ attribute: false })
    buckets: MarkerBucket[] = [];

    /** Where the renderer drew each dot, in CSS pixels from the plot's top left. A bucket with no placement gets no button. */
    @property({ attribute: false })
    placements: UauiMarkerPlacement[] = [];

    /** Formats a marker's date. */
    @property({ attribute: false })
    dateFormat: Intl.DateTimeFormat = new Intl.DateTimeFormat();

    /** The dots (by date index) the pointer is over and the keyboard is on. Hover wins. */
    @state()
    private _hover?: number;

    @state()
    private _focus?: number;

    /** What `active-change` last said, so it is only raised on a change. */
    #reported?: number;

    override connectedCallback() {
        super.connectedCallback();
        document.addEventListener("keydown", this.#onDocumentKeydown);
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener("keydown", this.#onDocumentKeydown);
        this._hover = undefined;
        this._focus = undefined;
        this.#report(undefined);
    }

    /** WCAG 1.4.13: Escape hides a tooltip that opened on hover or focus, without moving the pointer or focus. */
    #onDocumentKeydown = (e: KeyboardEvent) => {
        if (e.key !== "Escape") return;
        this._hover = undefined;
        this._focus = undefined;
    };

    protected override willUpdate(changed: PropertyValues<this>) {
        super.willUpdate(changed);
        if (changed.has("buckets")) {
            // The old buttons go without a mouseleave or blur, so what they set would stick.
            this._hover = undefined;
            this._focus = undefined;
        }
    }

    protected override updated(changed: PropertyValues<this>) {
        super.updated(changed);
        this.#report(this.#active);
        if (this.#active !== undefined) void this.#placeTooltip();
    }

    /** The hovered or focused dot, only while it has a bucket and a placement. */
    get #active() {
        const index = this._hover ?? this._focus;
        if (index === undefined) return undefined;
        const drawn = this.buckets.some((b) => b.index === index) && this.placements.some((p) => p.index === index);
        return drawn ? index : undefined;
    }

    #report(index: number | undefined) {
        if (index === this.#reported) return;
        this.#reported = index;
        this.dispatchEvent(new CustomEvent<UauiChartMarkersActiveDetail>("active-change", { detail: { index } }));
    }

    /** Puts the tooltip over its dot, centred, kept inside the plot. */
    async #placeTooltip() {
        const tip = this.shadowRoot?.querySelector<UauiChartMarkerTooltipElement>("uaui-chart-marker-tooltip");
        if (!tip) return;
        await placeTooltip(tip, ({ width }) => {
            const placement = this.placements.find((p) => p.index === this.#active);
            return placement ? { left: clampInside(placement.x - width / 2, width, this.clientWidth) } : undefined;
        });
    }

    /** The marker's date, whatever time of day it carries. */
    #dateText(marker: UauiMarker) {
        return formatIsoDate(dateOnly(marker.date), this.dateFormat);
    }

    #label(bucket: MarkerBucket) {
        const entries = bucket.markers.map((m) => this.localize.term("uauiAnalytics_chartMarkerEntry", m.title, this.#dateText(m)));
        const text = entries.join(this.localize.term("uauiAnalytics_chartMarkerSeparator"));
        return this.localize.term("uauiAnalytics_chartMarkerAriaLabel", text);
    }

    #onClick(e: MouseEvent, bucket: MarkerBucket) {
        // A pointer click leaves focus on the button; only the hover then shows the tooltip, so it goes when the pointer does.
        if (e.detail > 0) this._focus = undefined;
        this.dispatchEvent(new CustomEvent<UauiMarkerClickDetail>("marker-click", { detail: { id: bucket.markers[0].id } }));
    }

    /** One button over each dot, in date order so the tab order follows the timeline. */
    #renderButtons() {
        const placements = new Map(this.placements.map((p) => [p.index, p]));
        const active = this.#active;
        const drawn = this.buckets.filter((b) => placements.has(b.index));
        // Keyed by what the button stands for, so a reused button never stands for a different bucket.
        return repeat(
            drawn,
            (bucket) => `${bucket.index}:${bucket.markers.map((m) => m.id).join(",")}`,
            (bucket) => {
                const placement = placements.get(bucket.index)!;
                return html`<button
                    type="button"
                    class="marker"
                    style="left:${placement.x}px; top:${placement.y}px"
                    aria-label=${this.#label(bucket)}
                    aria-describedby=${active === bucket.index ? "marker-tooltip" : nothing}
                    @mouseenter=${() => (this._hover = bucket.index)}
                    @mouseleave=${() => (this._hover = undefined)}
                    @focus=${() => (this._focus = bucket.index)}
                    @blur=${() => (this._focus = undefined)}
                    @click=${(e: MouseEvent) => this.#onClick(e, bucket)}></button>`;
            },
        );
    }

    #renderTooltip() {
        const bucket = this.buckets.find((b) => b.index === this.#active);
        if (!bucket) return nothing;
        const shown = bucket.markers.slice(0, MAX_MARKERS_IN_TOOLTIP);
        return html`<uaui-chart-marker-tooltip
            id="marker-tooltip"
            style="visibility:hidden"
            .entries=${shown.map((m) => ({ date: this.#dateText(m), title: m.title, description: m.description }))}
            .more=${bucket.markers.length - shown.length}></uaui-chart-marker-tooltip>`;
    }

    override render(): TemplateResult {
        return html`${this.#renderButtons()} ${this.#renderTooltip()}`;
    }

    static override styles: CSSResultGroup = css`
        :host {
            position: absolute;
            inset: 0;
            display: block;
            pointer-events: none;
        }

        /* The canvas draws the dot; this transparent button over it is the hover and focus target. */
        .marker {
            position: absolute;
            z-index: 1;
            width: 24px;
            height: 24px;
            margin: -12px 0 0 -12px;
            padding: 0;
            border: 0;
            border-radius: 50%;
            background: transparent;
            cursor: pointer;
            pointer-events: auto;
        }

        .marker:focus-visible {
            outline: 2px solid var(--uui-color-focus);
            outline-offset: 0;
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-chart-markers": UauiChartMarkersElement;
    }
}
