import { css, customElement, html, nothing, type CSSResultGroup } from "@umbraco-cms/backoffice/external/lit";
import { umbFocus } from "@umbraco-cms/backoffice/lit-element";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UmbTextStyles } from "@umbraco-cms/backoffice/style";
import { builtInPresetRange, compareRangeFor, parseIso, todayIso } from "../internal/date/date-math.js";
import { displayIsoDate } from "../internal/date/format-date.js";
import "./internal/compare-group.element.js";
import type { UauiCompareGroupChangeDetail } from "./internal/compare-group.element.js";
import "./internal/date-field.element.js";
import type { UauiDateFieldElement } from "./internal/date-field.element.js";
import { defaultPresets } from "./presets.js";
import type { UauiDateRange, UauiDatePreset, UauiDateRangeModalData, UauiDateRangeModalValue } from "./types.js";

const CUSTOM = "custom";

const presetTerms: Record<string, string> = {
    "last-7-days": "uauiAnalytics_dateRangeLast7Days",
    "last-30-days": "uauiAnalytics_dateRangeLast30Days",
    "last-month": "uauiAnalytics_dateRangeLastMonth",
    "last-year": "uauiAnalytics_dateRangeLastYear",
    [CUSTOM]: "uauiAnalytics_dateRangeCustom",
};

type Field = "from" | "to" | "compare-from" | "compare-to";

/**
 * The dialog behind `uaui-date-range`: pick a preset or type two dates, then Save or Close.
 * Opened through the backoffice modal manager with `UAUI_DATE_RANGE_MODAL`, not placed on a page.
 *
 * The edits live in the modal's value, as in the backoffice's own modals: Save submits it, Close rejects it.
 *
 * @element uaui-date-range-modal
 */
@customElement("uaui-date-range-modal")
export class UauiDateRangeModalElement extends UmbModalBaseElement<UauiDateRangeModalData, UauiDateRangeModalValue> {
    get #today() {
        return this.data?.today || todayIso();
    }

    get #maxDate() {
        return this.data?.maxDate || this.#today;
    }

    /** The presets to offer, with "custom" always last. */
    get #presets(): UauiDatePreset[] {
        const presets = this.data?.presets ?? defaultPresets();
        return presets.some((p) => p.id === CUSTOM) ? presets : [...presets, { id: CUSTOM }];
    }

    #presetRange(preset: UauiDatePreset) {
        return preset.range?.(this.#today) ?? builtInPresetRange(preset.id, this.#today);
    }

    #presetLabel(preset: UauiDatePreset) {
        return preset.label ?? (presetTerms[preset.id] ? this.localize.term(presetTerms[preset.id]) : preset.id);
    }

    /** The saved preset, or the one whose dates match, or custom. */
    get #presetId(): string {
        const { from, to, preset } = this.value?.value ?? { from: "", to: "" };
        if (preset && this.#presets.some((p) => p.id === preset)) return preset;
        const match = this.#presets.find((p) => {
            const range = this.#presetRange(p);
            return range?.from === from && range?.to === to;
        });
        return match?.id ?? CUSTOM;
    }

    /** Changes the main range. A previous-period or previous-year comparison follows it; a custom one stays put. */
    #setRange(changes: Partial<UauiDateRange>) {
        const current = this.value?.value ?? { from: "", to: "" };
        const range = { ...current, ...changes };
        const compare = this.value?.compare;
        const dates = compare && compareRangeFor(compare.mode, range);
        this.updateValue({ value: range, compare: dates ? { mode: compare.mode, ...dates } : compare });
    }

    #onCompareChange(e: CustomEvent<UauiCompareGroupChangeDetail>) {
        this.updateValue({ compare: e.detail.compare });
    }

    #onPresetChange(e: Event) {
        const id = (e.target as HTMLInputElement).value;
        const preset = this.#presets.find((p) => p.id === id);
        const range = preset && this.#presetRange(preset);
        this.#setRange({ ...range, preset: id });
    }

    #onDateChange(field: "from" | "to", e: Event) {
        this.#setRange({ [field]: (e.target as UauiDateFieldElement).value, preset: CUSTOM });
    }

    /** The message under a field, or `undefined` when it is fine. The end date shows its own range error. */
    #error(field: Field): string | undefined {
        const { from, to, date } = this.#dates(field);
        const max = this.#maxDate;
        if (parseIso(date) && date > max) {
            return this.localize.term("uauiAnalytics_dateRangeErrorAfterMaxDate", displayIsoDate(max, this.localize));
        }
        if (field.endsWith("to") && parseIso(from) && parseIso(to) && to < from) {
            return this.localize.term("uauiAnalytics_dateRangeErrorEndBeforeStart");
        }
        return undefined;
    }

    /** The start and end of the range `field` belongs to, and the field's own date. A date field is empty when there's no comparison. */
    #dates(field: Field) {
        const isCompare = field.startsWith("compare");
        const range = (isCompare ? this.value?.compare : this.value?.value) ?? { from: "", to: "" };
        return { from: range.from, to: range.to, date: field.endsWith("from") ? range.from : range.to };
    }

    /** A date field the editor left empty or half-typed has no value. */
    #isEmpty(field: Field) {
        return !parseIso(this.#dates(field).date);
    }

    #renderDate(field: "from" | "to", label: string) {
        return html`<uaui-date-field
            .name=${field}
            label=${label}
            .value=${this.#dates(field).date}
            .max=${this.#maxDate}
            .error=${this.#error(field)}
            @change=${(e: Event) => this.#onDateChange(field, e)}></uaui-date-field>`;
    }

    #renderCompare() {
        return html`<uaui-compare-group
            .range=${this.value?.value ?? { from: "", to: "" }}
            .compare=${this.value?.compare}
            max-date=${this.#maxDate}
            .errors=${{ from: this.#error("compare-from"), to: this.#error("compare-to") }}
            @change=${this.#onCompareChange}></uaui-compare-group>`;
    }

    /** Fixed on first render, so focus never jumps while the editor types. Save when it can be pressed, else the first field. */
    #focusSave?: boolean;

    override render() {
        const fields: Field[] = ["from", "to", ...(this.value?.compare ? (["compare-from", "compare-to"] as const) : [])];
        const invalid = fields.some((f) => !!this.#error(f) || this.#isEmpty(f));
        const presetId = this.#presetId;
        this.#focusSave ??= !invalid;
        return html`
            <uui-dialog-layout class="uui-text" headline=${this.localize.term("uauiAnalytics_dateRangeModalHeadline")}>
                <div class="row">
                    <uui-form-layout-item>
                        <uui-select
                            name="preset"
                            label=${this.localize.term("uauiAnalytics_dateRangePreset")}
                            .options=${this.#presets.map((p) => ({
                                name: this.#presetLabel(p),
                                value: p.id,
                                selected: p.id === presetId,
                            }))}
                            .value=${presetId}
                            ${this.#focusSave ? nothing : umbFocus()}
                            @change=${this.#onPresetChange}></uui-select>
                    </uui-form-layout-item>
                    ${this.#renderDate("from", this.localize.term("uauiAnalytics_dateRangeFrom"))}
                    ${this.#renderDate("to", this.localize.term("uauiAnalytics_dateRangeTo"))}
                </div>
                ${this.data?.allowCompare ? this.#renderCompare() : nothing}

                <uui-button
                    slot="actions"
                    label=${this.localize.term("general_close")}
                    @click=${() => this._rejectModal()}></uui-button>
                <uui-button
                    slot="actions"
                    class="save"
                    look="primary"
                    color="positive"
                    label=${this.localize.term("buttons_save")}
                    ?disabled=${invalid}
                    ${this.#focusSave ? umbFocus() : nothing}
                    @click=${() => this._submitModal()}></uui-button>
            </uui-dialog-layout>
        `;
    }

    static override styles: CSSResultGroup = [
        UmbTextStyles,
        css`
            uui-dialog-layout {
                min-inline-size: min(560px, 90vw);
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

            uui-select {
                width: 100%;
            }

            /* UUI's dark positive button is white-ish text on #347d39, 4.4:1 (below AA); pure white is 5.1:1 */
            .save {
                --uui-color-positive-contrast: var(--uui-palette-white-light);
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-date-range-modal": UauiDateRangeModalElement;
    }
}
