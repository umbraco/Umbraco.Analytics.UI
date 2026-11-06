import { css, customElement, html, nothing, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import type { UauiFigureText } from "../format/figure.js";
import "./figure-value.element.js";

const PLACEHOLDER = "{0}";

/**
 * The line under a `uaui-kpi-tile`'s value. `pattern` is split at every `{0}`; the text parts are drawn as plain text
 * (never HTML) and each gap gets the `figure` as a `uaui-figure-value`. A pattern with no `{0}` is drawn as given. A
 * pattern with `{0}` but no `figure`, or an empty pattern, draws nothing. Other placeholders stay as typed. The line is
 * cut with "…" when it is too long, and its title holds the full shown text. Both are properties only (no attribute
 * form). Internal: not exported.
 *
 * @element uaui-figure-detail
 */
@customElement("uaui-figure-detail")
export class UauiFigureDetailElement extends UmbLitElement {
    /** The text of the line, with `{0}` where the number goes. */
    @property({ attribute: false })
    pattern?: string;

    /** The number to draw in each `{0}`. */
    @property({ attribute: false })
    figure?: UauiFigureText;

    override render(): TemplateResult | typeof nothing {
        const pattern = this.pattern;
        if (!pattern) return nothing;
        const parts = pattern.split(PLACEHOLDER);
        const figure = this.figure;
        if (parts.length > 1 && !figure) return nothing;
        const shown = figure ? parts.join(figure.text) : pattern;
        return html`<span class="line" title=${shown}
            >${parts.map((part, index) => html`${index > 0 ? html`<uaui-figure-value .figure=${figure}></uaui-figure-value>` : nothing}${part}`)}</span
        >`;
    }

    static override styles: CSSResultGroup = css`
        :host {
            display: block;
            min-width: 0;
            font-size: 13px;
            font-weight: 400;
            line-height: 1.3;
            color: var(--uui-color-text-alt);
            font-variant-numeric: tabular-nums;
        }

        .line {
            display: block;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-figure-detail": UauiFigureDetailElement;
    }
}
