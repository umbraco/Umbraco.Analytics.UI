import { css, customElement, html, nothing, type CSSResultGroup } from "@umbraco-cms/backoffice/external/lit";
import { umbFocus } from "@umbraco-cms/backoffice/lit-element";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import { UmbTextStyles } from "@umbraco-cms/backoffice/style";
// Registers umb-input-date, the backoffice's date field
import "@umbraco-cms/backoffice/components";
import { builtInPresetRange, isoToDate, parseIso, todayIso } from "./date-math.js";
import { defaultPresets } from "./presets.js";
import type { UaxDatePreset, UaxDateRangeModalData, UaxDateRangeModalValue } from "./types.js";

const CUSTOM = "custom";

const presetTerms: Record<string, string> = {
    "last-7-days": "uaxAnalytics_dateRangeLast7Days",
    "last-30-days": "uaxAnalytics_dateRangeLast30Days",
    "last-month": "uaxAnalytics_dateRangeLastMonth",
    "last-year": "uaxAnalytics_dateRangeLastYear",
    [CUSTOM]: "uaxAnalytics_dateRangeCustom",
};

type Field = "from" | "to";

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

    #setRange(changes: Partial<UaxDateRangeModalValue["value"]>) {
        const current = this.value?.value ?? { from: "", to: "" };
        this.updateValue({ value: { ...current, ...changes } });
    }

    #onPresetChange(e: Event) {
        const id = (e.target as HTMLInputElement).value;
        const preset = this.#presets.find((p) => p.id === id);
        const range = preset && this.#presetRange(preset);
        this.#setRange({ ...range, preset: id });
    }

    #onDateChange(field: Field, e: Event) {
        this.#setRange({ [field]: (e.target as HTMLInputElement).value, preset: CUSTOM });
    }

    /** The message under a field, or `undefined` when it is fine. The end date shows its own range error. */
    #error(field: Field): string | undefined {
        const { from, to } = this.value?.value ?? { from: "", to: "" };
        const date = field === "from" ? from : to;
        const max = this.#maxDate;
        if (parseIso(date) && date > max) {
            return this.localize.term("uaxAnalytics_dateRangeErrorAfterMaxDate", this.#formatDate(max));
        }
        if (field === "to" && parseIso(from) && parseIso(to) && to < from) {
            return this.localize.term("uaxAnalytics_dateRangeErrorEndBeforeStart");
        }
        return undefined;
    }

    #formatDate(iso: string) {
        const date = isoToDate(iso);
        return date ? this.localize.date(date, { dateStyle: "medium" }) : iso;
    }

    /** A date field the editor left empty or half-typed has no value. */
    #isEmpty(field: Field) {
        return !parseIso(this.value?.value?.[field]);
    }

    #renderDate(field: Field, label: string) {
        const error = this.#error(field);
        const empty = this.#isEmpty(field);
        return html`<uui-form-layout-item>
            <umb-input-date
                type="date"
                name=${field}
                label=${label}
                .value=${this.value?.value?.[field] ?? ""}
                .max=${this.#maxDate}
                ?error=${!!error}
                @change=${(e: Event) => this.#onDateChange(field, e)}></umb-input-date>
            ${error
                ? html`<div slot="message" class="error" data-for=${field} role="alert">${error}</div>`
                : empty
                  ? html`<div slot="message" class="error" data-for=${field}>
                        ${this.localize.term("validation_invalidEmpty")}
                    </div>`
                  : nothing}
        </uui-form-layout-item>`;
    }

    /** Fixed on first render, so focus never jumps while the editor types. Save when it can be pressed, else the first field. */
    #focusSave?: boolean;

    override render() {
        const invalid = !!this.#error("from") || !!this.#error("to") || this.#isEmpty("from") || this.#isEmpty("to");
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
