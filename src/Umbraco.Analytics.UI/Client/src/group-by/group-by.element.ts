import { css, customElement, html, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "../toggle-group/toggle-group.element.js";
import type { UauiToggleGroupChangeDetail } from "../toggle-group/toggle-group.element.js";

/** How a chart groups its points: one per day, week or month. */
export type UauiGroupBy = "day" | "week" | "month";

/** The detail of the `change` event of `uaui-group-by`: the option the editor picked. */
export type UauiGroupByChangeDetail = { value: UauiGroupBy };

const allOptions = (): UauiGroupBy[] => ["day", "week", "month"];

const termKeys: Record<UauiGroupBy, string> = {
    day: "uauiAnalytics_groupByDay",
    week: "uauiAnalytics_groupByWeek",
    month: "uauiAnalytics_groupByMonth",
};

/**
 * Switches a chart between daily, weekly and monthly points: a `uaui-toggle-group` control.
 *
 * Keyboard behaviour is that of `uaui-toggle-group`. Put it in a `uui-box`'s `header-actions` slot.
 *
 * @element uaui-group-by
 * @fires change - The editor picked a different option. Bubbles, not cancelable. `detail` is `{ value }` (`UauiGroupByChangeDetail`).
 */
@customElement("uaui-group-by")
export class UauiGroupByElement extends UmbLitElement {
    /** The selected option. Picking an option updates it, as `uui-radio-group` does, then raises `change`. */
    @property({ type: String, reflect: true })
    value: UauiGroupBy = "day";

    /** The options to show, in order. Defaults to day, week and month. */
    @property({ attribute: false })
    options: UauiGroupBy[] = allOptions();

    #onChange(e: CustomEvent<UauiToggleGroupChangeDetail>) {
        // The inner change doesn't leave this shadow root; raise our own with the typed value.
        const value = e.detail.value as UauiGroupBy;
        if (value === this.value) return;
        this.value = value;
        this.dispatchEvent(new CustomEvent<UauiGroupByChangeDetail>("change", { bubbles: true, detail: { value } }));
    }

    override render(): TemplateResult {
        return html`<uaui-toggle-group
            .value=${this.value}
            .label=${this.localize.term("uauiAnalytics_groupByLabel")}
            .options=${this.options.map((value) => ({ value, label: this.localize.term(termKeys[value]) }))}
            @change=${this.#onChange}></uaui-toggle-group>`;
    }

    static override styles: CSSResultGroup = css`
        :host {
            display: inline-flex;
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-group-by": UauiGroupByElement;
    }
}
