import {
    css,
    customElement,
    html,
    ifDefined,
    nothing,
    property,
    type CSSResultGroup,
    type PropertyValues,
    type TemplateResult,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "../empty-state/empty-state.element.js";
import { getLoadingMode } from "../internal/loading/loading-mode.js";
import "../internal/loading/loading-bar.element.js";
import "../internal/loading/skeleton.element.js";
import { uaxThemeTokens } from "../internal/theme/tokens.css.js";
import { asNumber, asText, getNumberFormat } from "./internal/number-format.js";
import { safeHref } from "./internal/safe-href.js";
import type { UaxTableColumn } from "./types.js";

type UaxTableRow = Record<string, unknown>;

/** A column with everything the cells need, worked out once per change of columns, rows or language. */
interface DerivedColumn {
    column: UaxTableColumn;
    align: "start" | "end";
    /** `number`, `percent` and `share` columns: the value. */
    format?: Intl.NumberFormat;
    /** `share` columns: the percent of the column total. */
    shareFormat?: Intl.NumberFormat;
    /** `share` columns: the palette slot of the bar. */
    color: 1 | 2 | 3 | 4;
    /** `share` columns: the sum and the largest of the column's values. */
    total: number;
    max: number;
}

interface DerivedFrom {
    columns: UaxTableColumn[];
    rows: UaxTableRow[];
    lang: string;
}

const SKELETON_ROWS = 5;
/** Widths of the skeleton blocks, varied by row so the placeholder doesn't look like a grid of equal bars. */
const SKELETON_WIDTHS = [72, 54, 83, 47, 65];

const shareFormatOptions: Intl.NumberFormatOptions = { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 };
const percentFormatOptions: Intl.NumberFormatOptions = { style: "percent", maximumFractionDigits: 1 };

/**
 * A table of rows, with columns that show their values as text, links, numbers, percentages or a
 * share of the column total with a bar.
 *
 * Built on `uui-table`, so it looks like the backoffice's own tables. Put it in a `uui-box` with
 * `--uui-box-default-padding: 0` so it runs edge to edge: the cells pad themselves, and the toolbar
 * slot pads itself with `--uax-table-padding`.
 *
 * Values are raw numbers. They are formatted in the editor's culture, with the column's `valueFormat`.
 * A `share` column shows the value, its percent of the column's total, and a thin bar scaled to the
 * column's largest value. The first share column uses the palette slot `--uax-series-1`, the second
 * `--uax-series-2` and so on, unless the column sets `color`.
 *
 * While `loading` is set it shows skeleton rows on first load, or keeps the old rows under a loading
 * bar when reloading. With no rows it shows `uax-empty-state` under the header. Replace `rows` and
 * `columns` with new arrays to update the table: changing one in place isn't noticed.
 *
 * @element uax-data-table
 * @slot toolbar - Content above the header row, such as a search box and totals. It pads itself with `--uax-table-padding`.
 * @cssprop --uax-table-padding - Padding around the `toolbar` slot, as a CSS `padding` value. Defaults to `12px 24px`. The loading bar ignores it and spans the full width at the top edge.
 * @cssprop --uax-series-1 - Bar colour of the first share column. Also `--uax-series-2` to `--uax-series-4` for the other slots.
 * @cssprop --uax-tint-neutral - Colour of the track behind a share bar.
 */
@customElement("uax-data-table")
export class UaxDataTableElement extends UmbLitElement {
    /** The columns, left to right. */
    @property({ attribute: false })
    columns: UaxTableColumn[] = [];

    /** The rows. Each column reads its value from the row's `key`. */
    @property({ attribute: false })
    rows: Record<string, unknown>[] = [];

    /** Shows skeleton rows on first load, or a loading bar over the old rows when reloading. */
    @property({ type: Boolean, reflect: true })
    loading = false;

    /** Headline of the empty state. Defaults to the translation of "No data yet". */
    @property({ type: String, attribute: "empty-headline" })
    emptyHeadline?: string;

    /** Description of the empty state. Defaults to the translation of "Try a wider date range.". */
    @property({ type: String, attribute: "empty-description" })
    emptyDescription?: string;

    #derived: DerivedColumn[] = [];
    #derivedFrom?: DerivedFrom;

    protected override willUpdate(changed: PropertyValues<this>) {
        super.willUpdate(changed);
        const lang = this.localize.lang();
        const prev = this.#derivedFrom;
        if (!prev || prev.columns !== this.columns || prev.rows !== this.rows || prev.lang !== lang) {
            this.#derivedFrom = { columns: this.columns, rows: this.rows, lang };
            this.#derived = this.#derive(this.columns, this.#statsRows, lang);
        }
    }

    /**
     * The rows that column totals and bar scales are worked out from. All rows for now: when paging
     * and search arrive, a share stays a share of the whole column, not of the page on screen.
     */
    get #statsRows(): UaxTableRow[] {
        return this.rows;
    }

    /** The rows to draw. Sorting, searching and paging will narrow this. */
    get #visibleRows(): UaxTableRow[] {
        return this.rows;
    }

    /** Whether anything is slotted into `toolbar`. `:host(:has())` can't tell, and a slot can't be styled by its content. */
    get #hasToolbar(): boolean {
        return this.querySelector(':scope > [slot="toolbar"]') !== null;
    }

    /** How many skeleton rows to draw on first load. */
    get #skeletonRowCount(): number {
        return SKELETON_ROWS;
    }

    #derive(columns: UaxTableColumn[], rows: UaxTableRow[], lang: string): DerivedColumn[] {
        let shareIndex = 0;
        return columns.map((column) => {
            const type = column.type;
            const derived: DerivedColumn = {
                column,
                align: column.align ?? (type === "number" || type === "percent" ? "end" : "start"),
                color: 1,
                total: 0,
                max: 0,
            };
            if (type === "number") derived.format = getNumberFormat(lang, column.valueFormat);
            if (type === "percent") derived.format = getNumberFormat(lang, { ...percentFormatOptions, ...column.valueFormat });
            if (type === "share") {
                derived.format = getNumberFormat(lang, column.valueFormat);
                derived.shareFormat = getNumberFormat(lang, shareFormatOptions);
                derived.color = column.color ?? ((shareIndex % 4) + 1) as 1 | 2 | 3 | 4;
                shareIndex++;
                for (const row of rows) {
                    const value = asNumber(row[column.key]);
                    if (value === undefined) continue;
                    derived.total += value;
                    derived.max = Math.max(derived.max, value);
                }
            }
            return derived;
        });
    }

    #renderCell(derived: DerivedColumn, row: UaxTableRow): TemplateResult | typeof nothing | string {
        const { column } = derived;
        switch (column.type) {
            case "link":
                return this.#renderLink(column, row);
            case "number":
            case "percent": {
                const value = asNumber(row[column.key]);
                return value === undefined ? "" : derived.format!.format(value);
            }
            case "share":
                return this.#renderShare(derived, row);
            default:
                return asText(row[column.key]);
        }
    }

    #renderLink(column: UaxTableColumn, row: UaxTableRow): TemplateResult | string {
        const text = asText(row[column.key]);
        const href = column.hrefKey ? safeHref(row[column.hrefKey]) : undefined;
        return href ? html`<a href=${href}>${text}</a>` : text;
    }

    #renderShare(derived: DerivedColumn, row: UaxTableRow): TemplateResult | typeof nothing {
        const value = asNumber(row[derived.column.key]);
        if (value === undefined) return nothing;
        const share = derived.total ? value / derived.total : 0;
        const width = derived.max > 0 ? Math.round(Math.min(Math.max(value / derived.max, 0), 1) * 10000) / 100 : 0;
        return html`<div class="share">
            <div class="share-top">
                <span class="share-value">${derived.format!.format(value)}</span> <span class="share-percent">(${derived.shareFormat!.format(share)})</span>
            </div>
            <div class="share-track" aria-hidden="true">
                <div class="share-bar" style="width: ${width}%; background-color: var(--_uax-series-${derived.color})"></div>
            </div>
        </div>`;
    }

    #renderHeaderCell(derived: DerivedColumn): TemplateResult {
        return html`<uui-table-head-cell class=${this.#cellClass(derived)}>${derived.column.label}</uui-table-head-cell>`;
    }

    /**
     * Share columns get an equal slice of at most 27% each (the design's 46 / 27 / 27 split), so the
     * bars line up between tables and a long URL wraps instead of squeezing them. The other columns share what's left.
     */
    #columnWidth(derived: DerivedColumn): string | undefined {
        if (derived.column.type !== "share") return undefined;
        const shares = this.#derived.filter((d) => d.column.type === "share").length;
        return `width: ${Math.min(27, 80 / shares)}%`;
    }

    #cellClass(derived: DerivedColumn): string {
        const numeric = derived.column.type === "number" || derived.column.type === "percent" || derived.column.type === "share";
        return `${derived.align === "end" ? "end" : "start"}${numeric ? " numeric" : ""}`;
    }

    #renderRow(row: UaxTableRow): TemplateResult {
        return html`<uui-table-row>
            ${this.#derived.map(
                (derived) => html`<uui-table-cell class=${this.#cellClass(derived)}>${this.#renderCell(derived, row)}</uui-table-cell>`,
            )}
        </uui-table-row>`;
    }

    #renderSkeletonRow(index: number): TemplateResult {
        return html`<uui-table-row>
            ${this.#derived.map((derived, column) => {
                const text = derived.column.type === "text" || derived.column.type === "link";
                const width = text ? SKELETON_WIDTHS[(index + column) % SKELETON_WIDTHS.length] : 40;
                return html`<uui-table-cell class=${this.#cellClass(derived)}>
                    <div class="skeleton-cell">
                        <uax-skeleton style="width: ${width}%; height: var(--_uax-skeleton-height)"></uax-skeleton>
                    </div>
                </uui-table-cell>`;
            })}
        </uui-table-row>`;
    }

    override render() {
        const hasData = this.rows.length > 0;
        const mode = getLoadingMode(this.loading, hasData);
        const hasShare = this.#derived.some((derived) => derived.column.type === "share");
        return html`<div class="region ${hasShare ? "has-share" : ""} ${this.#hasToolbar ? "has-toolbar" : ""}">
            ${mode === "reload" ? html`<uax-loading-bar></uax-loading-bar>` : nothing}
            <div class="toolbar"><slot name="toolbar" @slotchange=${() => this.requestUpdate()}></slot></div>
            <uui-table aria-busy=${this.loading ? "true" : "false"}>
                ${this.#derived.map((derived) => html`<uui-table-column style=${ifDefined(this.#columnWidth(derived))}></uui-table-column>`)}
                <uui-table-head>${this.#derived.map((derived) => this.#renderHeaderCell(derived))}</uui-table-head>
                ${mode === "skeleton"
                    ? Array.from({ length: this.#skeletonRowCount }, (_, index) => this.#renderSkeletonRow(index))
                    : this.#visibleRows.map((row) => this.#renderRow(row))}
            </uui-table>
            ${mode === "idle" && !hasData
                ? html`<uax-empty-state .headline=${this.emptyHeadline} .description=${this.emptyDescription}></uax-empty-state>`
                : nothing}
        </div>`;
    }

    static override styles: CSSResultGroup = [
        uaxThemeTokens,
        css`
            :host {
                display: block;
                --_uax-skeleton-height: 14px;
                --_uax-table-line: 20px;
                font-size: 13px;
                line-height: var(--_uax-table-line);
            }

            .region {
                position: relative;
                /* A uui-box doesn't clip its content, so the last row would square off the box's rounded bottom corners. */
                overflow: clip;
                border-radius: 0 0 var(--uui-box-border-radius, var(--uui-border-radius-3)) var(--uui-box-border-radius, var(--uui-border-radius-3));
                /* The tallest content a body row holds, so a skeleton row and a loaded row are the same height. */
                --_uax-table-content-height: var(--_uax-table-line);
            }

            .region.has-share {
                --_uax-table-content-height: calc(var(--_uax-table-line) + 5px + 4px);
            }

            /* The toolbar pads itself, only when something is slotted, so the loading bar can span the full width. */
            .has-toolbar .toolbar {
                padding: var(--uax-table-padding, var(--uui-size-space-4) var(--uui-size-space-6));
            }

            uax-loading-bar {
                z-index: 3;
            }

            /* uui-table draws its own border and corners. The surrounding box does both, edge to edge. */
            uui-table {
                border: none;
                border-radius: 0;
            }

            uui-table-head {
                background-color: var(--uui-color-surface-alt);
            }

            .has-toolbar uui-table-head-cell {
                border-top: 1px solid var(--uui-color-border);
            }

            uui-table-head-cell {
                --uui-table-cell-height: auto;
                --uui-table-cell-padding: var(--uui-size-3) var(--uui-size-5);
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.6px;
                text-transform: uppercase;
                color: var(--uui-color-text-alt);
                white-space: nowrap;
            }

            uui-table-cell {
                --uui-table-cell-height: auto;
                --uui-table-cell-padding: var(--uui-size-5);
                color: var(--uui-color-text);
                /* Long URLs wrap anywhere rather than stretch the column. */
                overflow-wrap: anywhere;
            }

            .start {
                text-align: start;
            }

            .end {
                text-align: end;
            }

            .numeric {
                font-variant-numeric: tabular-nums;
            }

            a {
                color: var(--uui-color-interactive);
                text-decoration: none;
                border-radius: var(--uui-border-radius);
            }

            a:hover {
                color: var(--uui-color-interactive-emphasis);
                text-decoration: underline;
            }

            a:focus-visible {
                outline: calc(2px * var(--uui-show-focus-outline, 1)) solid var(--uui-color-focus);
                outline-offset: 2px;
            }

            .share {
                display: flex;
                flex-direction: column;
                gap: 5px;
                min-width: 92px;
            }

            .share-top {
                display: flex;
                align-items: baseline;
                gap: 6px;
                height: var(--_uax-table-line);
            }

            .end .share-top {
                justify-content: flex-end;
            }

            .share-value {
                font-weight: 700;
            }

            .share-percent {
                font-size: 12px;
                color: var(--uui-color-text-alt);
            }

            .share-track {
                height: 4px;
                border-radius: 999px;
                background-color: var(--_uax-tint-neutral);
                overflow: hidden;
            }

            .share-bar {
                height: 100%;
                border-radius: 999px;
            }

            .skeleton-cell {
                display: flex;
                align-items: center;
                min-height: var(--_uax-table-content-height);
            }

            .end .skeleton-cell {
                justify-content: flex-end;
            }

            uax-empty-state {
                border-top: 1px solid var(--uui-color-border);
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uax-data-table": UaxDataTableElement;
    }
}
