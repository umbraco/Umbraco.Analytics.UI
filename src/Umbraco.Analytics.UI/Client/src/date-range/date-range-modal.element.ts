import { css, customElement, html, nothing, type CSSResultGroup } from "@umbraco-cms/backoffice/external/lit";
import { umbFocus } from "@umbraco-cms/backoffice/lit-element";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UmbTextStyles } from "@umbraco-cms/backoffice/style";
// Registers umb-input-date, the backoffice's date field
import "@umbraco-cms/backoffice/components";
import { builtInPresetRange, isoToDate, parseIso, previousPeriodRange, previousYearRange, todayIso } from "./date-math.js";
import { defaultPresets } from "./presets.js";
import type { UaxCompare, UaxDateRange, UaxDatePreset, UaxDateRangeModalData, UaxDateRangeModalValue } from "./types.js";

const CUSTOM = "custom";

const presetTerms: Record<string, string> = {
    "last-7-days": "uaxAnalytics_dateRangeLast7Days",
    "last-30-days": "uaxAnalytics_dateRangeLast30Days",
    "last-month": "uaxAnalytics_dateRangeLastMonth",
    "last-year": "uaxAnalytics_dateRangeLastYear",
    [CUSTOM]: "uaxAnalytics_dateRangeCustom",
};

const compareModeTerms: Record<UaxCompare["mode"], string> = {
    "previous-period": "uaxAnalytics_dateRangeComparePreviousPeriod",
    "previous-year": "uaxAnalytics_dateRangeComparePreviousYear",
    [CUSTOM]: "uaxAnalytics_dateRangeCompareCustom",
};

type Field = "from" | "to" | "compare-from" | "compare-to";

/** The dates a non-custom compare mode gives for `range`, or `undefined` when `range` isn't valid yet. */
function compareDates(mode: UaxCompare["mode"], range: UaxDateRange) {
    if (mode === "previous-period") return previousPeriodRange(range);
    if (mode === "previous-year") return previousYearRange(range);
    return undefined;
}

/**
 * The dialog behind `uax-date-range`: pick a preset or type two dates, then Save or Close.
 * Opened through the backoffice modal manager with `UAX_DATE_RANGE_MODAL`, not placed on a page.
 *
 * The edits live in the modal's value, as in the backoffice's own modals: Save submits it, Close rejects it.
 *
 * @element uax-date-range-modal
 */
@customElement("uax-date-range-modal")
export class UaxDateRangeModalElement extends UmbModalBaseElement<UaxDateRangeModalData, UaxDateRangeModalValue> {
    get #today() {
        return todayIso();
    }

    get #maxDate() {
        return this.data?.maxDate || this.#today;
    }

    /** The presets to offer, with "custom" always last. */
    get #presets(): UaxDatePreset[] {
        const presets = this.data?.presets ?? defaultPresets();
        return presets.some((p) => p.id === CUSTOM) ? presets : [...presets, { id: CUSTOM }];
    }

    #presetRange(preset: UaxDatePreset) {
        return preset.range?.(this.#today) ?? builtInPresetRange(preset.id, this.#today);
    }

    #presetLabel(preset: UaxDatePreset) {
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
    #setRange(changes: Partial<UaxDateRange>) {
        const current = this.value?.value ?? { from: "", to: "" };
        const range = { ...current, ...changes };
        const compare = this.value?.compare;
        const dates = compare && compareDates(compare.mode, range);
        this.updateValue({ value: range, compare: dates ? { mode: compare.mode, ...dates } : compare });
    }

    #onCompareToggle(e: Event) {
        const on = (e.target as HTMLInputElement).checked;
        const range = this.value?.value ?? { from: "", to: "" };
        const mode = "previous-period";
        this.updateValue({ compare: on ? { mode, from: "", to: "", ...compareDates(mode, range) } : undefined });
    }

    #onCompareModeChange(e: Event) {
        const mode = (e.target as HTMLInputElement).value as UaxCompare["mode"];
        const current = this.value?.compare ?? { from: "", to: "" };
        const dates = compareDates(mode, this.value?.value ?? { from: "", to: "" });
        this.updateValue({ compare: { from: current.from, to: current.to, ...dates, mode } });
    }

    #onCompareDateChange(field: "from" | "to", e: Event) {
        const current = this.value?.compare ?? { from: "", to: "" };
        this.updateValue({ compare: { ...current, [field]: (e.target as HTMLInputElement).value, mode: CUSTOM } });
    }

    #onPresetChange(e: Event) {
        const id = (e.target as HTMLInputElement).value;
        const preset = this.#presets.find((p) => p.id === id);
        const range = preset && this.#presetRange(preset);
        this.#setRange({ ...range, preset: id });
    }

    #onDateChange(field: "from" | "to", e: Event) {
        this.#setRange({ [field]: (e.target as HTMLInputElement).value, preset: CUSTOM });
    }

    /** The message under a field, or `undefined` when it is fine. The end date shows its own range error. */
    #error(field: Field): string | undefined {
        const { from, to, date } = this.#dates(field);
        const max = this.#maxDate;
        if (parseIso(date) && date > max) {
            return this.localize.term("uaxAnalytics_dateRangeErrorAfterMaxDate", this.#formatDate(max));
        }
        if (field.endsWith("to") && parseIso(from) && parseIso(to) && to < from) {
            return this.localize.term("uaxAnalytics_dateRangeErrorEndBeforeStart");
        }
        return undefined;
    }

    /** The start and end of the range `field` belongs to, and the field's own date. A date field is empty when there's no comparison. */
    #dates(field: Field) {
        const isCompare = field.startsWith("compare");
        const range = (isCompare ? this.value?.compare : this.value?.value) ?? { from: "", to: "" };
        return { from: range.from, to: range.to, date: field.endsWith("from") ? range.from : range.to };
    }

    #formatDate(iso: string) {
        const date = isoToDate(iso);
        return date ? this.localize.date(date, { dateStyle: "medium" }) : iso;
    }

    /** A date field the editor left empty or half-typed has no value. */
    #isEmpty(field: Field) {
        return !parseIso(this.#dates(field).date);
    }

    #renderDate(field: Field, label: string) {
        const date = this.#dates(field).date;
        const error = this.#error(field);
        const empty = this.#isEmpty(field);
        return html`<uui-form-layout-item>
            <umb-input-date
                type="date"
                name=${field}
                label=${label}
                .value=${date}
                .max=${this.#maxDate}
                ?error=${!!error}
                @change=${(e: Event) =>
                    field.startsWith("compare")
                        ? this.#onCompareDateChange(field === "compare-from" ? "from" : "to", e)
                        : this.#onDateChange(field as "from" | "to", e)}></umb-input-date>
            ${error
                ? html`<div slot="message" class="error" data-for=${field} role="alert">${error}</div>`
                : empty
                  ? html`<div slot="message" class="error" data-for=${field}>
                        ${this.localize.term("validation_invalidEmpty")}
                    </div>`
                  : nothing}
        </uui-form-layout-item>`;
    }

    #renderCompare() {
        const compare = this.value?.compare;
        return html`<uui-toggle
                name="compare"
                label=${this.localize.term("uaxAnalytics_dateRangeCompare")}
                .checked=${!!compare}
                @change=${this.#onCompareToggle}></uui-toggle>
            ${compare
                ? html`<div class="row">
                      <uui-form-layout-item>
                          <uui-select
                              name="compare-mode"
                              label=${this.localize.term("uaxAnalytics_dateRangeCompareMode")}
                              .options=${(Object.keys(compareModeTerms) as UaxCompare["mode"][]).map((mode) => ({
                                  name: this.localize.term(compareModeTerms[mode]),
                                  value: mode,
                                  selected: mode === compare.mode,
                              }))}
                              .value=${compare.mode}
                              @change=${this.#onCompareModeChange}></uui-select>
                      </uui-form-layout-item>
                      ${this.#renderDate("compare-from", this.localize.term("uaxAnalytics_dateRangeCompareStart"))}
                      ${this.#renderDate("compare-to", this.localize.term("uaxAnalytics_dateRangeCompareEnd"))}
                  </div>`
                : nothing}`;
    }

    /** Fixed on first render, so focus never jumps while the editor types. Save when it can be pressed, else the first field. */
    #focusSave?: boolean;

    override render() {
        const fields: Field[] = ["from", "to", ...(this.value?.compare ? (["compare-from", "compare-to"] as const) : [])];
        const invalid = fields.some((f) => !!this.#error(f) || this.#isEmpty(f));
        const presetId = this.#presetId;
        this.#focusSave ??= !invalid;
        return html`
            <uui-dialog-layout class="uui-text" headline=${this.localize.term("uaxAnalytics_dateRangeModalHeadline")}>
                <div class="row">
                    <uui-form-layout-item>
                        <uui-select
                            name="preset"
                            label=${this.localize.term("uaxAnalytics_dateRangePreset")}
                            .options=${this.#presets.map((p) => ({
                                name: this.#presetLabel(p),
                                value: p.id,
                                selected: p.id === presetId,
                            }))}
                            .value=${presetId}
                            ${this.#focusSave ? nothing : umbFocus()}
                            @change=${this.#onPresetChange}></uui-select>
                    </uui-form-layout-item>
                    ${this.#renderDate("from", this.localize.term("uaxAnalytics_dateRangeFrom"))}
                    ${this.#renderDate("to", this.localize.term("uaxAnalytics_dateRangeTo"))}
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

            uui-toggle {
                display: block;
                margin-block: var(--uui-size-space-4);
            }

            uui-select,
            umb-input-date {
                width: 100%;
            }

            /* UUI's dark positive button is white-ish text on #347d39, 4.4:1 (below AA); pure white is 5.1:1 */
            .save {
                --uui-color-positive-contrast: var(--uui-palette-white-light);
            }

            .error {
                margin-top: var(--uui-size-space-1);
                font-size: var(--uui-type-small-size);
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uax-date-range-modal": UaxDateRangeModalElement;
    }
}
