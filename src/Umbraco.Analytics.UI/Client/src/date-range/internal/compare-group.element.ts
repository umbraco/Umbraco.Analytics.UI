import { css, customElement, html, nothing, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { compareRangeFor } from "../../internal/date/date-math.js";
import type { UauiCompare, UauiDateRange } from "../types.js";
import "./date-field.element.js";

const CUSTOM = "custom";

const compareModeTerms: Record<UauiCompare["mode"], string> = {
    "previous-period": "uauiAnalytics_dateRangeComparePreviousPeriod",
    "previous-year": "uauiAnalytics_dateRangeComparePreviousYear",
    [CUSTOM]: "uauiAnalytics_dateRangeCompareCustom",
};

/** The messages under the two comparison dates, `undefined` for a date that is fine. */
export type UauiCompareGroupErrors = { from?: string; to?: string };

/** The detail of the `change` event of `uaui-compare-group`: the comparison to use, `undefined` once turned off. */
export type UauiCompareGroupChangeDetail = { compare: UauiCompare | undefined };

/**
 * The comparison part of the date range dialog: the Compare switch and, while it is on, a labelled group with the
 * mode and the two comparison dates. It is controlled: it shows `compare` and raises `change` with the new
 * comparison, working out the dates of a previous-period or previous-year mode from `range`. Internal: not exported.
 *
 * @element uaui-compare-group
 * @fires change - The editor changed the comparison. Bubbles, not composed. `detail` is `{ compare }` (`UauiCompareGroupChangeDetail`).
 */
@customElement("uaui-compare-group")
export class UauiCompareGroupElement extends UmbLitElement {
    /** The main range, which a previous-period or previous-year comparison follows. */
    @property({ attribute: false })
    range: UauiDateRange = { from: "", to: "" };

    /** The comparison, or `undefined` while Compare is off. */
    @property({ attribute: false })
    compare?: UauiCompare;

    /** ISO date the comparison dates may not be after. */
    @property({ type: String, attribute: "max-date" })
    maxDate = "";

    /** The messages under the comparison dates. */
    @property({ attribute: false })
    errors: UauiCompareGroupErrors = {};

    #raise(compare: UauiCompare | undefined) {
        this.dispatchEvent(new CustomEvent<UauiCompareGroupChangeDetail>("change", { bubbles: true, detail: { compare } }));
    }

    #onToggle(e: Event) {
        e.stopPropagation();
        const on = (e.target as HTMLInputElement).checked;
        const mode = "previous-period";
        this.#raise(on ? { mode, from: "", to: "", ...compareRangeFor(mode, this.range) } : undefined);
    }

    #onModeChange(e: Event) {
        e.stopPropagation();
        const mode = (e.target as HTMLInputElement).value as UauiCompare["mode"];
        const current = this.compare ?? { from: "", to: "" };
        this.#raise({ from: current.from, to: current.to, ...compareRangeFor(mode, this.range), mode });
    }

    #onDateChange(field: "from" | "to", e: Event) {
        e.stopPropagation();
        const current = this.compare ?? { from: "", to: "" };
        this.#raise({ ...current, [field]: (e.target as HTMLInputElement).value, mode: CUSTOM });
    }

    override render(): TemplateResult {
        const { compare } = this;
        return html`<uui-toggle
                name="compare"
                label=${this.localize.term("uauiAnalytics_dateRangeCompare")}
                .checked=${!!compare}
                @change=${this.#onToggle}></uui-toggle>
            ${compare
                ? html`<div class="row" role="group" aria-label=${this.localize.term("uauiAnalytics_dateRangeCompare")}>
                      <uui-form-layout-item>
                          <uui-select
                              name="compare-mode"
                              label=${this.localize.term("uauiAnalytics_dateRangeCompareMode")}
                              .options=${(Object.keys(compareModeTerms) as UauiCompare["mode"][]).map((mode) => ({
                                  name: this.localize.term(compareModeTerms[mode]),
                                  value: mode,
                                  selected: mode === compare.mode,
                              }))}
                              .value=${compare.mode}
                              @change=${this.#onModeChange}></uui-select>
                      </uui-form-layout-item>
                      <uaui-date-field
                          .name=${"compare-from"}
                          label=${this.localize.term("uauiAnalytics_dateRangeCompareStart")}
                          .value=${compare.from}
                          .max=${this.maxDate}
                          .error=${this.errors.from}
                          @change=${(e: Event) => this.#onDateChange("from", e)}></uaui-date-field>
                      <uaui-date-field
                          .name=${"compare-to"}
                          label=${this.localize.term("uauiAnalytics_dateRangeCompareEnd")}
                          .value=${compare.to}
                          .max=${this.maxDate}
                          .error=${this.errors.to}
                          @change=${(e: Event) => this.#onDateChange("to", e)}></uaui-date-field>
                  </div>`
                : nothing}`;
    }

    static override styles: CSSResultGroup = css`
        :host {
            display: block;
        }

        .row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
            gap: var(--uui-size-space-4);
            align-items: start;
        }

        uui-form-layout-item {
            margin: 0;
        }

        uui-toggle {
            display: block;
            margin-block: var(--uui-size-space-4);
        }

        uui-select {
            width: 100%;
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-compare-group": UauiCompareGroupElement;
    }
}
