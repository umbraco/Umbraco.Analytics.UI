import { css, customElement, html, nothing, property, type CSSResultGroup, type PropertyValues, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UauiPaletteStyles } from "../../theme/index.js";
import { asNumber, asText } from "../internal/cell-values.js";
import { getNumberFormat } from "../../internal/format/number-format.js";
import "../internal/table-skeleton-cell.element.js";
import type { UauiTableCellElement, UauiTableColumn } from "../types.js";

/** The tone of a `uaui-status-cell`, by the names of `uui-tag`'s `color`. */
export type UauiStatusTone = "default" | "positive" | "warning" | "danger";

const TONES: ReadonlySet<string> = new Set<UauiStatusTone>(["default", "positive", "warning", "danger"]);

/** The row's tone, or `"default"` for anything that isn't one. */
const toneOf = (value: unknown): UauiStatusTone => (typeof value === "string" && TONES.has(value) ? (value as UauiStatusTone) : "default");

/**
 * A table cell that shows a row's status as a tinted label, for "Active", "Out of stock" or "3 days". The product picks
 * the tone and the words per row, in row fields that the column's meta names: `meta.toneKey` holds a `UauiStatusTone`
 * (`"default"`, `"positive"`, `"warning"` or `"danger"`, as `uui-tag`'s colours; anything else is `"default"`) and
 * `meta.textKey` the text. Without text, the cell shows the value: a number formatted with the column's `valueFormat`,
 * other values as text. The words carry the meaning, the tone only repeats it, so never leave the text to the colour.
 * Sorting and search use the value (`column.key`), as for every cell. Its name is `UAUI_TABLE_CELL.status`, and it is
 * usable on its own.
 *
 * @element uaui-status-cell
 * @cssprop --uaui-tint-neutral - Background of the `default` tone.
 * @cssprop --uaui-tint-positive - Background of the `positive` tone. Defaults to a tint of `--uui-color-positive`.
 * @cssprop --uaui-tint-warning - Background of the `warning` tone. Defaults to a tint of `--uui-color-warning`.
 * @cssprop --uaui-tint-negative - Background of the `danger` tone. Defaults to a tint of `--uui-color-danger`.
 * @cssprop --uaui-text-neutral - Text colour of the `default` tone. Defaults to `--uui-color-text-alt`.
 * @cssprop --uaui-text-positive - Text colour of the `positive` tone. Defaults to forest green (dark theme: jungle green), which passes 4.5:1 on the tint.
 * @cssprop --uaui-text-warning - Text colour of the `warning` tone. Defaults to dark sunglow (dark theme: sunglow), which passes 4.5:1 on the tint.
 * @cssprop --uaui-text-negative - Text colour of the `danger` tone. Defaults to dark maroon (dark theme: spanish pink), which passes 4.5:1 on the tint.
 */
@customElement("uaui-status-cell")
export class UauiStatusCellElement extends UmbLitElement implements UauiTableCellElement {
    /**
     * The column the cell is in. Its `meta.toneKey` names the key in `item` that holds the tone, `meta.textKey` the
     * key that holds the text, and `valueFormat` formats a number value when there is no text.
     */
    @property({ attribute: false })
    column: UauiTableColumn = { key: "value", label: "" };

    /** The row the cell is in. */
    @property({ attribute: false })
    item: Record<string, unknown> = {};

    /** The row's value. Shown when the row has no text. */
    @property({ attribute: false })
    value: unknown;

    /** Draws a placeholder instead of the value while the table loads. */
    @property({ type: Boolean })
    loading = false;

    #format?: { column: UauiTableColumn; lang: string; format: Intl.NumberFormat };

    protected override willUpdate(changed: PropertyValues<this>) {
        super.willUpdate(changed);
        const lang = this.localize.lang();
        if (this.#format?.column !== this.column || this.#format.lang !== lang) {
            this.#format = { column: this.column, lang, format: getNumberFormat(lang, this.column.valueFormat) };
        }
    }

    #text(): string {
        const textKey = this.column.meta?.textKey;
        const text = textKey ? asText(this.item[textKey]).trim() : "";
        if (text) return text;
        const number = asNumber(this.value);
        return number === undefined ? asText(this.value).trim() : this.#format!.format.format(number);
    }

    override render(): TemplateResult | typeof nothing {
        if (this.loading) return html`<uaui-table-skeleton-cell .align=${this.column.align ?? "start"}></uaui-table-skeleton-cell>`;
        const text = this.#text();
        if (!text) return nothing;
        const toneKey = this.column.meta?.toneKey;
        const tone = toneOf(toneKey ? this.item[toneKey] : undefined);
        return html`<span class="status" data-tone=${tone}>${text}</span>`;
    }

    static override styles: CSSResultGroup = [
        UauiPaletteStyles,
        css`
            /* The compare badge's "sm" size, so a status and a change badge in one row look alike. */
            .status {
                display: inline-block;
                padding: 1px 5px;
                border-radius: var(--uui-border-radius-1);
                font-size: 11.5px;
                font-weight: 700;
                line-height: 1.4;
                font-variant-numeric: tabular-nums;
                white-space: nowrap;
                vertical-align: middle;
            }

            [data-tone="default"] {
                color: var(--uaui-color-text-neutral);
                background: var(--uaui-color-tint-neutral);
            }

            [data-tone="positive"] {
                color: var(--uaui-color-text-positive);
                background: var(--uaui-color-tint-positive);
            }

            [data-tone="warning"] {
                color: var(--uaui-color-text-warning);
                background: var(--uaui-color-tint-warning);
            }

            [data-tone="danger"] {
                color: var(--uaui-color-text-negative);
                background: var(--uaui-color-tint-negative);
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-status-cell": UauiStatusCellElement;
    }
}
