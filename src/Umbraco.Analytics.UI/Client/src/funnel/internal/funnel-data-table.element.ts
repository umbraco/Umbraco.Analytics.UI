import { css, customElement, html, nothing, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UauiVisuallyHiddenStyles } from "../../internal/a11y/visually-hidden.css.js";

/** One step as the hidden table lists it, every figure already formatted ("" for the first step's "from previous" cells). */
export interface UauiFunnelTableRow {
    label: string;
    value: string;
    ofFirst: string;
    fromPrevious: string;
    /** The previous step's value minus this one, or 0 when this one is larger. */
    droppedOff: string;
    compare: string;
    compareFromPrevious: string;
    compareDroppedOff: string;
}

/**
 * The visually hidden table of `uaui-funnel`'s data, for screen readers: a row per step with its value, its share of
 * the first step and of the previous one, and how many dropped off since the previous one; when comparing, the compare
 * value, rate and drop-off too. Internal: not exported.
 *
 * @element uaui-funnel-data-table
 */
@customElement("uaui-funnel-data-table")
export class UauiFunnelDataTableElement extends UmbLitElement {
    @property({ attribute: false })
    rows: UauiFunnelTableRow[] = [];

    /** Adds the compare columns. */
    @property({ type: Boolean })
    comparing = false;

    override render(): TemplateResult {
        const value = this.localize.term("uauiAnalytics_funnelTableValueHeader");
        const fromPrevious = this.localize.term("uauiAnalytics_funnelFromPrevious");
        const droppedOff = this.localize.term("uauiAnalytics_funnelTableDroppedOffHeader");
        return html`<table class="visually-hidden">
            <caption>
                ${this.localize.term("uauiAnalytics_funnelTableCaption")}
            </caption>
            <thead>
                <tr>
                    <th scope="col">${this.localize.term("uauiAnalytics_funnelTableStepHeader")}</th>
                    <th scope="col">${value}</th>
                    <th scope="col">${this.localize.term("uauiAnalytics_funnelTableOfFirstHeader")}</th>
                    <th scope="col">${fromPrevious}</th>
                    <th scope="col">${droppedOff}</th>
                    ${this.comparing
                        ? html`<th scope="col">${this.localize.term("uauiAnalytics_chartTableCompareHeader", value)}</th>
                              <th scope="col">${this.localize.term("uauiAnalytics_chartTableCompareHeader", fromPrevious)}</th>
                              <th scope="col">${this.localize.term("uauiAnalytics_chartTableCompareHeader", droppedOff)}</th>`
                        : nothing}
                </tr>
            </thead>
            <tbody>
                ${this.rows.map(
                    (row) => html`<tr>
                        <th scope="row">${row.label}</th>
                        <td>${row.value}</td>
                        <td>${row.ofFirst}</td>
                        <td>${row.fromPrevious}</td>
                        <td>${row.droppedOff}</td>
                        ${this.comparing
                            ? html`<td>${row.compare}</td>
                                  <td>${row.compareFromPrevious}</td>
                                  <td>${row.compareDroppedOff}</td>`
                            : nothing}
                    </tr>`,
                )}
            </tbody>
        </table>`;
    }

    static override styles: CSSResultGroup = [
        UauiVisuallyHiddenStyles,
        css`
            :host {
                position: relative;
                display: block;
                height: 0;
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-funnel-data-table": UauiFunnelDataTableElement;
    }
}
