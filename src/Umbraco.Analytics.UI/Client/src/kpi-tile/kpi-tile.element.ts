import { css, customElement, html, ifDefined, nothing, property, type CSSResultGroup, type LitElement, type TemplateResult } from "#platform/lit";
import { UauiLitElement } from "#platform/base-element";
import { getLoadingMode, isBusy } from "../internal/loading/index.js";
import { UauiVisuallyHiddenStyles } from "../internal/a11y/visually-hidden.css.js";
import { UauiPaletteStyles } from "../theme/index.js";
import { deltaChange } from "../internal/delta/delta-change.js";
import { safeHref } from "../table/internal/safe-href.js";
import { badgeFigures, UauiFigureFormatter, type UauiFigureText } from "../internal/format/figure.js";
import type { UauiStatusColor } from "../theme/types.js";
import type { UauiDeltaUnit } from "../delta-badge/delta-badge.element.js";
import "../delta-badge/delta-badge.element.js";
import "../internal/figure/figure-value.element.js";
import { UauiWrapController } from "../internal/layout/wrap.controller.js";
import { hasFigureDetail } from "../internal/figure/figure-detail.element.js";

/**
 * A headline number as a card: an icon in a pink square, a label, the value and an optional change badge.
 *
 * Give `value` as a number and the tile formats it in the backoffice user's culture, with `valueFormat` for the style
 * (e.g. `{ style: "currency", currency: "EUR" }`). The product picks the currency or unit: the tile never guesses one.
 * A string `value` (and the `value` attribute, which is always a string) is shown exactly as given, for a figure the
 * product has formatted itself.
 *
 * The tile takes its width from its parent: a grid cell, or a flex item with `flex: 1`. In a shrink-to-fit parent (a plain
 * flex item, a float, an inline-block) it is 180px wide. Put tiles in a CSS grid row and they stay the same height, e.g.
 * `repeat(auto-fit, minmax(240px, 1fr))`. Below 240px wide the icon stacks above the label and value, and the
 * value steps down from 24px to 18px, so a number never runs out of the tile. A number `value` of 1,000,000 or more is
 * shown compact ("€1.23M", "1,23 mio." in Danish) so it fits, with the exact amount on hover and for screen readers;
 * `valueFormat: { notation: "standard" }` keeps the exact amount, and the step-down is only a backup. The badge drops below the value when the tile is too narrow for both. While `loading` with no `value` it shows a skeleton the size of a loaded tile. While
 * loading with a `value` it keeps the value and marks the tile busy, without a loading bar.
 *
 * Set `error` when the load failed: the tile keeps its label and shows a dash with the hidden text "Something went
 * wrong" in place of the value, and no change badge. It wins over `loading`, `no-data` and `value`. The tile stays selectable.
 *
 * Set `href` to make the tile a link that drills down (e.g. to a list filtered by the tile's metric), or `openable` to
 * make it a button that raises `open` for a product that navigates itself, as `uui-card` does. A tile is one target,
 * so only one of these applies: `selectable` wins over `href`, and `href` over `openable`.
 *
 * Set `no-data` when the range has no data: the tile shows a dash instead of a number and no change badge.
 * Leave `delta` unset when there is nothing to compare with (no badge); a `delta` of 0 is "no change" and
 * shows a neutral badge. Instead of `delta` you can give the two numbers, `current` and `previous`, and the badge
 * works out the change, as `uaui-delta-badge` does. `current` defaults to a number `value`, so then `previous` is
 * enough, on the value's scale (fractions for points with a percent `valueFormat`). `delta` wins when both are set.
 *
 * Give `detail` to add a quieter second line under the value, e.g. a part of the total ("114,300 cached"). `detail` is the
 * text, already translated by the product, with `{0}` where the number goes; `detailValue` is that number, formatted like
 * the value (or with `detailFormat`). The text is shown as text, never HTML, and only `{0}` is filled. When the value is
 * shown compact, the line's number is too. A pattern with `{0}` but no finite `detailValue`, no `detail`, no `value`, `error` and
 * `no-data` show no line. While `loading` with a `value` the line stays.
 *
 * @element uaui-kpi-tile
 * @fires selected - A selectable, unselected tile was pressed. Cancelable: cancel it to keep the tile unselected.
 * @fires deselected - A selectable, selected tile was pressed while `deselectable`. Cancelable: cancel it to keep the tile selected.
 * @fires open - An `openable` tile (without `selectable` or a usable `href`) was pressed. Not cancelable and doesn't bubble, as `uui-card`'s `open`.
 * @cssprop --uaui-kpi-icon-bg - Background of the icon square. Defaults to spanish pink in every theme, or the status tint when `color` is set.
 * @cssprop --uaui-kpi-selected - Colour of the selection border. Defaults to `--uui-color-selected` in light and high contrast, and to malibu light in dark, where the UUI colour is under 3:1 on the surface.
 * @cssprop --uaui-kpi-icon-fg - Icon colour. Defaults to space cadet, which passes 3:1 on the default square, or the status text colour when `color` is set. A product that overrides either owns that contrast.
 */
@customElement("uaui-kpi-tile")
export class UauiKpiTileElement extends UauiLitElement {
    /** What the number is, e.g. "Revenue". */
    @property({ type: String })
    label = "";

    /**
     * The figure. A number is formatted in the backoffice user's culture with `valueFormat`. A string (and the
     * attribute) is shown exactly as given, e.g. "€ 4,837.40" formatted by the product. 0 is a value; an empty string
     * or a number that isn't finite (NaN, Infinity) is no value, as unset is.
     */
    @property()
    value?: number | string;

    /**
     * How numbers are formatted, e.g. `{ style: "currency", currency: "EUR" }`. Formats a number `value`; a string
     * `value` is shown as given. The product picks the currency or unit. A number of 1,000,000 or more (negative too)
     * is shown compact ("€1.23M") unless this sets `notation`; `notation: "standard"` keeps the exact amount. The exact
     * amount is the hover title and what screen readers read. Options `Intl` rejects (e.g. a bad currency
     * code) fall back to the default number format.
     */
    @property({ type: Object, attribute: "value-format" })
    valueFormat?: Intl.NumberFormatOptions;

    /**
     * The text of a second line under the value, already translated by the product (e.g. `this.localize.term(...)`),
     * with `{0}` where `detailValue` goes, e.g. `{0} cached`. Only `{0}` is filled; other placeholders stay as typed. It
     * is shown as text, never HTML. With no `{0}` it is a plain note. Unset or empty shows no line, and so does a tile with no `value`.
     */
    @property({ type: String })
    detail?: string;

    /** The number for the `{0}` in `detail`. Not a finite number shows no line when `detail` has a `{0}`. */
    @property({ type: Number, attribute: "detail-value" })
    detailValue?: number;

    /**
     * How `detailValue` is formatted, as `valueFormat`. Defaults to `valueFormat`. The number is shown compact when the
     * value is, or when it is 1,000,000 or more, unless this sets `notation`.
     */
    @property({ type: Object, attribute: "detail-format" })
    detailFormat?: Intl.NumberFormatOptions;

    /**
     * The range has no data. Shows a dash with the hidden text "No data for this period" in place of the value, and no
     * change badge. Use it instead of showing "0". The tile stays selectable.
     */
    @property({ type: Boolean, attribute: "no-data", reflect: true })
    noData = false;

    /** The load failed. Shows a dash with the hidden text "Something went wrong" in place of the value, and no change badge. Wins over `loading`, `no-data` and `value`. */
    @property({ type: Boolean, reflect: true })
    error = false;

    /** Name of a backoffice icon, shown in the pink square. */
    @property({ type: String })
    icon?: string;

    /**
     * Tints the icon square with a status color, as the status cell does (`uui-tag`'s names: `"default"` is neutral
     * grey, then `"positive"`, `"warning"` and `"danger"`), for a row of status tiles such as approved, pending and
     * rejected. Unset keeps the pink square. The label carries the meaning; the color only repeats it.
     */
    @property({ type: String, reflect: true })
    color?: UauiStatusColor;

    /**
     * Makes the tile a link to this URL, as `uui-card`'s `href`, to drill down to the details. A URL that isn't
     * `http:`, `https:`, `mailto:`, `tel:` or relative is ignored. Ignored while `selectable`.
     */
    @property({ type: String })
    href?: string;

    /** The link's `target`, as `uui-card`'s. Only used with `href`. */
    @property({ type: String })
    target?: "_blank" | "_parent" | "_self" | "_top";

    /** The link's `rel`, as `uui-card`'s. Only used with `href`. Defaults to `noopener noreferrer` when `target` is `_blank`. */
    @property({ type: String })
    rel?: string;

    /**
     * Makes the tile a button that raises `open` when pressed (click, Enter or Space), for a product that handles the
     * navigation itself. Ignored while `selectable` or with a usable `href`.
     */
    @property({ type: Boolean, reflect: true })
    openable = false;

    /**
     * The change against the comparison period. 18.7 means +18.7%. 0 is "no change" (a neutral badge).
     * Unset, or not a finite number, means "unknown" (no comparison data) and shows no badge.
     */
    @property({ type: Number })
    delta?: number;

    /**
     * The value in the current period, as a number. With `previous`, the badge works out the change. Ignored when
     * `delta` is set. The shown value is still `value`. For points, give both in percent units (62 means 62%).
     *
     * Defaults to `value` when that is a number, and `previous` is then on the value's scale: with points and a
     * `valueFormat` of `style: "percent"`, both are fractions (0.256 against 0.24 is +1.6 pp), as a table column's are.
     */
    @property({ type: Number })
    current?: number;

    /**
     * The same value in the comparison period. With `current` (or a number `value`), the badge works out the change.
     * Ignored when `delta` is set. On the same scale as `current`, or as `value` when `current` is unset: with points
     * and a `valueFormat` of `style: "percent"`, a fraction then (0.24 is 24%).
     */
    @property({ type: Number })
    previous?: number;

    /** Whether the change is a percent change or a change in percentage points. */
    @property({ type: String, attribute: "delta-unit" })
    deltaUnit: UauiDeltaUnit = "percent";

    /** Shows a fall as good (green) and a rise as bad (red), e.g. for refund rate. */
    @property({ type: Boolean, attribute: "lower-is-better", reflect: true })
    lowerIsBetter = false;

    /** The product is fetching the value. */
    @property({ type: Boolean, reflect: true })
    loading = false;

    /**
     * Makes the tile a toggle button, so a row of tiles can switch a chart's metric. Pressing it raises a
     * cancelable `selected` or `deselected` event and then flips `selected`, unless the event was cancelled.
     * Follows `uui-card`, so product code reads the same.
     */
    @property({ type: Boolean, reflect: true })
    selectable = false;

    /** Draws the active state and reports `aria-pressed="true"`. Only has an effect while `selectable`. */
    @property({ type: Boolean, reflect: true })
    selected = false;

    /**
     * Whether pressing a selected tile deselects it. Set it to false (as a property) when exactly one tile
     * must stay selected: pressing the selected tile then raises nothing and changes nothing. (`uui-card`
     * raises `selected` again here.)
     */
    @property({ type: Boolean })
    deselectable = true;

    // Whether the badge no longer fits beside the value, so a tile with a line puts it below the line. Only a tile with
    // a line and a badge has a layout to choose; any other is the plain flex row, which wraps by itself.
    #wrap = new UauiWrapController(this, () => {
        const row = this.renderRoot?.querySelector<HTMLElement>(".row.has-detail");
        const value = row?.querySelector<HTMLElement>(".value");
        const badge = row?.querySelector<HTMLElement>("uaui-delta-badge");
        if (!row || !value || !badge) return null;
        return { row, first: value, second: badge, settle: [value.querySelector<LitElement>("uaui-figure-value"), badge as LitElement] };
    });

    #formatter = new UauiFigureFormatter();
    // A separate instance for the line: the formatter keeps one set of formats, and the line's options differ.
    #detailFormatter = new UauiFigureFormatter();

    // The text to show (and the exact amount behind a compact one), or undefined for no value. The formatter is built on first use and kept per language and options.
    get #shown(): UauiFigureText | undefined {
        return this.#formatter.figure(this.value, this.localize.lang(), this.valueFormat);
    }

    // The line's number, short whenever the value is (an `exact` means the value was shortened) unless the line's format sets a notation.
    #detailFigure(shown: UauiFigureText | undefined): UauiFigureText | undefined {
        return this.#detailFormatter.figure(this.detailValue, this.localize.lang(), this.detailFormat ?? this.valueFormat, {
            compact: shown?.exact !== undefined,
        });
    }

    // The badge's two numbers: `current` and `previous`, or a number `value` and `previous` on its scale.
    get #figures(): { current?: number; previous?: number } {
        return badgeFigures(this.value, this.current, this.previous, this.deltaUnit, this.valueFormat);
    }

    #toggle() {
        if (this.selected && !this.deselectable) return;
        const deselecting = this.selected;
        const event = new CustomEvent(deselecting ? "deselected" : "selected", { bubbles: true, cancelable: true, detail: {} });
        this.dispatchEvent(event);
        if (event.defaultPrevented) return;
        this.selected = !deselecting;
    }

    #open() {
        // As uui-card's open: a plain event that doesn't bubble.
        this.dispatchEvent(new CustomEvent("open", { detail: {} }));
    }

    // Whether there is a change to show: the same rule the badge uses, so no empty badge takes up room.
    #hasChange(figures: { current?: number; previous?: number }): boolean {
        return Number.isFinite(deltaChange(this.delta, figures.current, figures.previous, this.deltaUnit));
    }

    override render(): TemplateResult {
        const shown = this.#shown;
        const figures = this.#figures;
        const hasValue = shown !== undefined;
        const mode = getLoadingMode(this.loading, hasValue || this.noData, this.error);
        const busy = isBusy(this.loading, this.error);
        // No line when the tile shows no value (a part of nothing reads wrong) or when the line would draw nothing.
        const detailFigure = this.#detailFigure(shown);
        const showDetail = hasValue && !this.error && !this.noData && hasFigureDetail(this.detail, detailFigure);

        const content = html`${this.icon
                ? html`<span class="icon" aria-hidden="true"><uui-icon name=${this.icon}></uui-icon></span>`
                : nothing}
            <span class="content" aria-busy=${busy ? "true" : "false"}>
                ${mode === "skeleton"
                    ? // The skeleton is hidden from assistive tech, so the label stays as hidden text: a link or button tile keeps its name while loading.
                      html`<span class="visually-hidden">${this.label}</span><uaui-skeleton></uaui-skeleton>`
                    : html`<span class="body">
                          <span class="label">${this.label}</span>
                          <span class=${showDetail ? (this.#wrap.wrapped ? "row has-detail wrapped" : "row has-detail") : "row"}>
                              ${this.error || this.noData
                                  ? html`<span class="value no-data"
                                        ><span aria-hidden="true">—</span
                                        ><span class="visually-hidden">${this.localize.term(this.error ? "uauiAnalytics_errorHeadline" : "uauiAnalytics_kpiNoData")}</span></span
                                    >`
                                  : hasValue
                                    ? html`<span class="value"><uaui-figure-value .figure=${shown}></uaui-figure-value></span>`
                                    : nothing}
                              ${showDetail
                                  ? html`<uaui-figure-detail class="detail" .pattern=${this.detail} .figure=${detailFigure}></uaui-figure-detail>`
                                  : nothing}
                              ${this.error || this.noData || !this.#hasChange(figures)
                                  ? nothing
                                  : html`<uaui-delta-badge
                                        .value=${this.delta}
                                        .current=${figures.current}
                                        .previous=${figures.previous}
                                        .unit=${this.deltaUnit}
                                        .lowerIsBetter=${this.lowerIsBetter}></uaui-delta-badge>`}
                          </span>
                      </span>`}
            </span>`;

        // The wrapper is the size container the narrow layout queries (a container can't style itself, so it can't be the tile).
        return html`<div class="size">${this.#tile(content)}</div>`;
    }

    #tile(content: TemplateResult): TemplateResult {
        // Marks a tile asked for a line, so its skeleton can reserve the room for it in CSS.
        const hasDetail = this.detail ? " reserve-detail" : "";
        // A native button gives Enter and Space for free, and both arrive as one click.
        if (this.selectable) {
            return html`<button
                type="button"
                class="tile selectable${hasDetail}"
                aria-pressed=${this.selected ? "true" : "false"}
                @click=${this.#toggle}>
                ${content}<span class="select-border" aria-hidden="true"></span>
            </button>`;
        }
        const href = safeHref(this.href);
        if (href) {
            const rel = this.rel || (this.target === "_blank" ? "noopener noreferrer" : undefined);
            return html`<a class="tile open${hasDetail}" href=${href} target=${ifDefined(this.target || undefined)} rel=${ifDefined(rel)}>${content}</a>`;
        }
        return this.openable
            ? html`<button type="button" class="tile open${hasDetail}" @click=${this.#open}>${content}</button>`
            : html`<div class="tile${hasDetail}">${content}</div>`;
    }

    // Notes on the CSS below (kept out of the template so they don't ship in the bundle):
    // - --_uaui-kpi-value-size on .tile is the value's size, set once: 24px from a 240px tile, stepping down smoothly to
    //   18px at 180px. The skeleton heights read it too, so they follow the value down.
    // - .value's font-size is a backup for a very long number, stepping down with the tile.
    // - .row.has-detail is a grid. The value and badge fit on one line: the badge beside the value, the line below both.
    //   They don't (the tile measures it, see "wrapped"): the value, the line, then the badge. The value and the badge stay
    //   max-content wide in both, so what the tile measures doesn't change with the layout it picks.
    // - .tile.reserve-detail: with a line the skeleton is the height of a loaded tile with it, so the tile doesn't jump.
    //   From the top: the label (12px * 1.3), 5px, the value row, 5px, the line (13px * 1.3). The row is the value
    //   (1.1 * its font size) or the badge (24px) if taller: 26.4px at 24px, 24px at the 20px the value steps down to in a
    //   200px cell. This is the wide layout, the badge beside the value; a tile whose badge wraps below the value is taller
    //   still and grows to fit it. The narrow block sets the wrapped height.
    // - The narrow .tile.reserve-detail rule reserves the wrapped layout, loaded or not: label (12px * 1.3), 5px, the
    //   value (1.1 * its font size), 5px, the line (13px * 1.3), 5px, the badge's 3px margin and its 24px. It comes after
    //   the wide rule with the same specificity, so it wins.
    static override styles: CSSResultGroup = [
        UauiPaletteStyles,
        UauiVisuallyHiddenStyles,
        css`
            :host {
                display: block;
                height: 100%;
                /* Content height of a tile with the badge beside the value: the icon square. */
                --_uaui-skeleton-height: 48px;
                /* Pink square with a dark glyph in every theme (series-2 is maroon in light, so a dark glyph
                   on it fails 3:1). Both palette colours are theme-independent: space-cadet on spanish-pink
                   is 12.5:1. A product that overrides either public name owns the 3:1 between them. */
                --_uaui-kpi-icon-bg: var(--uaui-kpi-icon-bg, var(--uui-palette-spanish-pink));
                --_uaui-kpi-icon-fg: var(--uaui-kpi-icon-fg, var(--uui-palette-space-cadet));
                --_uaui-kpi-selected: var(
                    --uaui-kpi-selected,
                    light-dark(var(--uui-color-selected), var(--uui-palette-malibu-light))
                );
            }

            /* The size container for the narrow layout. It fills the host, and the host fills its grid cell, so its width is the
               tile's own width. Inline-size containment makes the content's width count as 0, so in a shrink-to-fit
               parent (a float, an inline-block, or a flex item without flex: 1) the tile would collapse to nothing: the
               min-width is the floor, so it is 180px wide there (and stacked). A grid cell or a flex: 1 item gives it its width. */
            .size {
                container-type: inline-size;
                height: 100%;
                min-width: 180px;
            }

            .tile {
                --_uaui-kpi-value-size: clamp(18px, 10cqi, 24px);
                box-sizing: border-box;
                height: 100%;
                display: flex;
                align-items: center;
                gap: 14px;
                padding: 16px 20px;
                background: var(--uui-color-surface);
                border: 1px solid var(--uui-color-border);
                border-radius: var(--uui-border-radius-3);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
            }

            button.tile,
            a.tile {
                /* Reset the button and link so they fill the row like the div card does. */
                appearance: none;
                position: relative;
                margin: 0;
                width: 100%;
                text-align: inherit;
                font: inherit;
                color: inherit;
                cursor: pointer;
                text-decoration: none;
            }

            /* Hover on a link or open button, as uui-card's open part: the label turns the interactive colour and underlines. */
            .open:hover .label {
                color: var(--uui-color-interactive-emphasis);
                text-decoration: underline;
            }

            /* The selection border copies uui-card: 2px just outside the card, with a glow. */
            .select-border {
                position: absolute;
                z-index: 2;
                inset: -2px;
                pointer-events: none;
                opacity: 0;
                transition: opacity 120ms;
            }

            .select-border::after {
                content: "";
                position: absolute;
                width: 100%;
                height: 100%;
                box-sizing: border-box;
                border: 2px solid var(--_uaui-kpi-selected);
                border-radius: calc(var(--uui-border-radius-3) + 2px);
                box-shadow:
                    0 0 4px 0 var(--_uaui-kpi-selected),
                    inset 0 0 2px 0 var(--_uaui-kpi-selected);
            }

            button.tile[aria-pressed="true"] .select-border {
                opacity: 1;
            }

            button.tile[aria-pressed="false"]:hover .select-border {
                opacity: 0.33;
            }

            button.tile[aria-pressed="true"]:hover .select-border {
                opacity: 0.8;
            }

            @media (prefers-reduced-motion: no-preference) {
                button.tile[aria-pressed="false"]:hover .select-border::after {
                    animation: not-selected--hover 1.2s infinite;
                }

                button.tile[aria-pressed="true"]:hover .select-border::after {
                    animation: selected--hover 1.4s infinite;
                }
            }

            @keyframes not-selected--hover {
                0%,
                100% {
                    opacity: 0.66;
                }
                50% {
                    opacity: 1;
                }
            }

            @keyframes selected--hover {
                0%,
                100% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.66;
                }
            }

            /* Same as uui-card: 3px wide and 3px off. */
            button.tile:focus-visible,
            a.tile:focus-visible {
                outline: 3px solid var(--uui-color-focus);
                outline-offset: 3px;
            }

            .icon {
                flex: 0 0 auto;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 48px;
                height: 48px;
                border-radius: 9px;
                background: var(--_uaui-kpi-icon-bg);
                color: var(--_uaui-kpi-icon-fg);
                font-size: 20px;
            }

            /* Status colours: the status cell's tint and text pairs, which pass 4.5:1 (an icon needs 3:1). */
            :host([color="default"]) {
                --_uaui-kpi-icon-bg: var(--uaui-kpi-icon-bg, var(--uaui-color-tint-neutral));
                --_uaui-kpi-icon-fg: var(--uaui-kpi-icon-fg, var(--uaui-color-text-neutral));
            }

            :host([color="positive"]) {
                --_uaui-kpi-icon-bg: var(--uaui-kpi-icon-bg, var(--uaui-color-tint-positive));
                --_uaui-kpi-icon-fg: var(--uaui-kpi-icon-fg, var(--uaui-color-text-positive));
            }

            :host([color="warning"]) {
                --_uaui-kpi-icon-bg: var(--uaui-kpi-icon-bg, var(--uaui-color-tint-warning));
                --_uaui-kpi-icon-fg: var(--uaui-kpi-icon-fg, var(--uaui-color-text-warning));
            }

            :host([color="danger"]) {
                --_uaui-kpi-icon-bg: var(--uaui-kpi-icon-bg, var(--uaui-color-tint-negative));
                --_uaui-kpi-icon-fg: var(--uaui-kpi-icon-fg, var(--uaui-color-text-negative));
            }

            .content {
                flex: 1;
                min-width: 0;
                min-height: var(--_uaui-skeleton-height);
                display: flex;
                flex-direction: column;
                justify-content: center;
            }

            .body {
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 5px;
            }

            .label {
                display: block;
                font-size: 12px;
                font-weight: 600;
                line-height: 1.3;
                color: var(--uui-color-text-alt);
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }

            .row {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 8px 10px;
            }

            .row.has-detail {
                display: grid;
                grid-template-columns: auto minmax(0, 1fr);
                grid-template-areas: "value badge" "detail detail";
                justify-content: start;
                align-items: center;
                gap: 5px 10px;
            }

            .row.has-detail.wrapped {
                grid-template-columns: auto;
                grid-template-areas: "value" "detail" "badge";
            }

            .row.has-detail .value {
                grid-area: value;
                width: max-content;
            }

            .row.has-detail .detail {
                grid-area: detail;
            }

            .row.has-detail uaui-delta-badge {
                grid-area: badge;
                justify-self: start;
            }

            .row.has-detail.wrapped uaui-delta-badge {
                margin-top: 3px;
            }

            .value {
                display: block;
                font-size: var(--_uaui-kpi-value-size);
                font-weight: 700;
                line-height: 1.1;
                white-space: nowrap;
                color: var(--uui-color-text);
            }

            /* Narrow tile: the icon moves above the label and value. 240px is where "€127,337.11" (about 138px at 24px, Lato
               bold) just stops fitting beside the 48px icon: 240 less the 34px of border and padding and the 62px icon and gap
               leaves 144px. It is also the recommended grid minimum, so a row built on it never stacks. All tiles in a row share a width, so they switch together. The text block is at least 76px (the
               content's min-height, the skeleton's height too), the height of one whose badge has wrapped below the value.
               A stacked tile reserves that block loaded or not, so it doesn't jump on load; one with no badge has 28px spare.
               align-items: flex-start follows the writing direction. */
            @container (width < 240px) {
                .tile {
                    --_uaui-skeleton-height: 76px;
                    flex-direction: column;
                    align-items: flex-start;
                    justify-content: flex-start;
                    gap: 12px;
                }

                .content {
                    flex: 0 0 auto;
                    align-self: stretch;
                    /* Top-aligned, so labels line up across a row when one tile's badge wraps and another's doesn't. */
                    justify-content: flex-start;
                }
            }

            .tile.reserve-detail {
                --_uaui-skeleton-height: calc(12px * 1.3 + 5px + max(24px, 1.1 * var(--_uaui-kpi-value-size)) + 5px + 13px * 1.3);
            }

            @container (width < 240px) {
                .tile.reserve-detail {
                    --_uaui-skeleton-height: calc(12px * 1.3 + 5px + 1.1 * var(--_uaui-kpi-value-size) + 5px + 13px * 1.3 + 5px + 3px + 24px);
                }
            }

            .no-data {
                position: relative;
                color: var(--uui-color-text-alt);
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-kpi-tile": UauiKpiTileElement;
    }
}
