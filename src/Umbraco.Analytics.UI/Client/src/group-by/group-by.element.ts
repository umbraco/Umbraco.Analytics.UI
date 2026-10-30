import { css, customElement, html, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "../segmented/segmented.element.js";
import type { UaxSegmentedChangeDetail } from "../segmented/segmented.element.js";

/** How a chart groups its points: one per day, week or month. */
export type UaxGroupBy = "day" | "week" | "month";

/** The detail of the `change` event of `uax-group-by`: the option the editor picked. */
export type UaxGroupByChangeDetail = { value: UaxGroupBy };

const allOptions = (): UaxGroupBy[] => ["day", "week", "month"];

const termKeys: Record<UaxGroupBy, string> = {
    day: "uaxAnalytics_groupByDay",
    week: "uaxAnalytics_groupByWeek",
    month: "uaxAnalytics_groupByMonth",
};

/**
 * Switches a chart between daily, weekly and monthly points: a `uax-segmented` control.
 *
 * Keyboard behaviour is that of `uax-segmented`. Put it in a `uui-box`'s `header-actions` slot.
 *
 * @element uax-group-by
 * @fires change - The editor picked a different option. Bubbles, not cancelable. `detail` is `{ value }` (`UaxGroupByChangeDetail`).
 */
@customElement("uax-group-by")
export class UaxGroupByElement extends UmbLitElement {
    /** The selected option. Picking an option updates it, as `uui-radio-group` does, then raises `change`. */
    @property({ type: String, reflect: true })
    value: UaxGroupBy = "day";

    /** The options to show, in order. Defaults to day, week and month. */
    @property({ attribute: false })
    options: UaxGroupBy[] = allOptions();

    #onChange(e: CustomEvent<UaxSegmentedChangeDetail>) {
        // The inner change doesn't leave this shadow root; raise our own with the typed value.
        const value = e.detail.value as UaxGroupBy;
        if (value === this.value) return;
        this.value = value;
        this.dispatchEvent(new CustomEvent<UaxGroupByChangeDetail>("change", { bubbles: true, detail: { value } }));
    }

    override render(): TemplateResult {
        return html`<uax-segmented
            .value=${this.value}
            .label=${this.localize.term("uaxAnalytics_groupByLabel")}
            .options=${this.options.map((value) => ({ value, label: this.localize.term(termKeys[value]) }))}
            @change=${this.#onChange}></uax-segmented>`;
    }

    static override styles: CSSResultGroup = css`
        :host {
            display: inline-flex;
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uax-group-by": UaxGroupByElement;
    }
}
