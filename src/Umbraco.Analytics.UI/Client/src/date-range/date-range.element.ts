import { css, customElement, html, nothing, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UMB_MODAL_MANAGER_CONTEXT, type UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { builtInPresetRange, parseIso, todayIso } from "../internal/date/date-math.js";
import { uauiFormatDateRange } from "../date-helpers/date-helpers.js";
import { UAUI_DATE_RANGE_MODAL } from "./date-range-modal.token.js";
import { defaultPresets } from "./presets.js";
import type { UauiCompare, UauiDatePreset, UauiDateRange, UauiDateRangeChangeDetail } from "./types.js";

const defaultValue = (today: string): UauiDateRange => ({
    ...builtInPresetRange("last-30-days", today)!,
    preset: "last-30-days",
});

/**
 * Shows the chosen date range on a button and opens a dialog to change it. Put it in a `uui-box`'s
 * `header-actions` slot.
 *
 * The dialog opens through the backoffice modal manager, so `uaui-date-range-modal` must be registered as a
 * `modal` extension and the element must sit under a modal manager (the backoffice provides both).
 * Like `uaui-group-by`, it sets its own `value` when the editor saves, then raises `change`.
 *
 * @element uaui-date-range
 * @fires change - The editor saved the dialog. Bubbles, not composed or cancelable, like `uaui-group-by`. `detail` is `{ value, compare }` (`UauiDateRangeChangeDetail`).
 */
@customElement("uaui-date-range")
export class UauiDateRangeElement extends UmbLitElement {
    /** The range shown. Defaults to the last 30 days, counted back from `today`. Setting `undefined` restores that default. */
    @property({ attribute: false })
    get value(): UauiDateRange {
        return this.#value ?? defaultValue(this.#today);
    }
    set value(value: UauiDateRange | undefined) {
        this.#value = value;
    }
    #value?: UauiDateRange;

    /** The comparison range shown under the dates, when there is one. */
    @property({ attribute: false })
    compare?: UauiCompare;

    /** The choices in the dialog, in order. "Custom" is always added last. Defaults to last 7 days, last 30 days, last month and last year. */
    @property({ attribute: false })
    presets: UauiDatePreset[] = defaultPresets();

    /** Whether the dialog offers a comparison. Defaults to true. A boolean attribute can't say false, so turn it off with the property: `.allowCompare=${false}`. */
    @property({ type: Boolean, attribute: "allow-compare" })
    allowCompare = true;

    /** The latest date the dialog accepts, as an ISO date. Defaults to `today`. */
    @property({ attribute: "max-date" })
    maxDate?: string;

    /**
     * The day the presets, the default `value` and the default `maxDate` count from, as an ISO date such as
     * "2026-06-23". Defaults to the browser's current day. Set it to keep demos and tests the same whenever they run.
     * Text that isn't a real date is ignored.
     */
    @property()
    today?: string;

    /** `today` when it is a real date, else the clock's day. */
    get #today(): string {
        return this.today && parseIso(this.today) ? this.today : todayIso();
    }

    #modalManager?: UmbModalManagerContext;

    constructor() {
        super();
        this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (manager) => {
            this.#modalManager = manager;
        });
    }

    #rangeText(from: string, to: string) {
        return uauiFormatDateRange(this.localize, { from, to });
    }

    async #open() {
        if (!this.#modalManager) {
            console.warn("uaui-date-range: no UMB_MODAL_MANAGER_CONTEXT found, so the dialog can't open.", this);
            return;
        }
        // Copies: the modal context deep-freezes what it is given, and these belong to the product.
        const modal = this.#modalManager.open(this, UAUI_DATE_RANGE_MODAL, {
            data: { presets: this.presets, today: this.#today, maxDate: this.maxDate || this.#today, allowCompare: this.allowCompare },
            value: { value: { ...this.value }, compare: this.compare && { ...this.compare } },
        });
        // Closing the dialog rejects it: that is the editor discarding their edits, not an error.
        const result = await modal.onSubmit().catch(() => undefined);
        if (!result) return;
        this.value = result.value;
        this.compare = result.compare;
        this.dispatchEvent(
            new CustomEvent<UauiDateRangeChangeDetail>("change", {
                bubbles: true,
                detail: { value: this.value, compare: this.compare },
            }),
        );
    }

    override render(): TemplateResult {
        const range = this.#rangeText(this.value.from, this.value.to);
        const compareShown = this.compare ? this.#rangeText(this.compare.from, this.compare.to) : undefined;
        const compareLine = compareShown ? this.localize.term("uauiAnalytics_dateRangeCompareShort", compareShown) : undefined;
        // The name is the purpose plus the two lines as shown, so the visible text is part of it (WCAG 2.5.3).
        const purpose = this.localize.term("uauiAnalytics_dateRangeButtonLabel");
        const label = compareLine
            ? this.localize.term("uauiAnalytics_dateRangeButtonNameCompare", purpose, range, compareLine)
            : this.localize.term("uauiAnalytics_dateRangeButtonName", purpose, range);
        return html`<uui-button look="outline" label=${label} class=${compareLine ? "has-compare" : ""} @click=${this.#open}>
            <!-- An empty default-slot child on purpose: with nothing assigned, uui-button draws its label text (our whole accessible name) as visible text. -->
            <span hidden></span>
            <!-- The "extra" slot, not the default one: UUI's default slot sits in a flex item that can't shrink below its text, so nothing inside it could ellipsize. -->
            <span slot="extra" class="content">
                <uui-icon name="icon-calendar"></uui-icon>
                <span class="text">
                    <span class="range">${range}</span>
                    ${compareLine ? html`<span class="compare">${compareLine}</span>` : nothing}
                </span>
            </span>
        </uui-button>`;
    }

    static override styles: CSSResultGroup = [
        css`
            :host {
                display: inline-block;
                max-width: 100%;
            }

            uui-button {
                --uui-button-height: 40px;
                --uui-button-font-weight: 400;
                /* Outline buttons dim their text in the dark theme; the interactive token reads as the design does in both */
                --uui-button-contrast: var(--uui-color-interactive);
                --uui-button-contrast-hover: var(--uui-color-interactive-emphasis);
            }

            uui-button {
                max-width: 100%;
            }

            /* Two lines in the same 40px: the vertical padding goes, the line height tightens. */
            uui-button.has-compare {
                --uui-button-padding-top-factor: 0;
                --uui-button-padding-bottom-factor: 0;
            }

            .content {
                display: flex;
                align-items: center;
                min-width: 0;
            }

            uui-icon {
                color: var(--uui-color-interactive);
                font-size: var(--uui-size-5);
                flex: none;
            }

            .text {
                display: inline-flex;
                flex-direction: column;
                align-items: flex-start;
                justify-content: center;
                min-width: 0;
                margin-inline-start: var(--uui-size-space-3);
                line-height: 1.1;
            }

            .range,
            .compare {
                max-width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .compare {
                font-size: var(--uui-type-small-size);
                color: var(--uui-color-text-alt);
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-date-range": UauiDateRangeElement;
    }
}
