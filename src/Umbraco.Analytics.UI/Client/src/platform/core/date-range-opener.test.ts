// SAC-9 AC1–AC7 — standalone core package (docs/plans/standalone-core).
// A real uaui-date-range opens its dialog through the core opener: button -> uui-modal-dialog -> dialog -> value.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { html } from "#platform/lit";
import { axeRun } from "../../internal/test/a11y.js";
import { deepQuery, recordEvents, renderElement, settle, shadow, type UauiTestElement } from "../../internal/test/dom.js";
import "../../date-range/date-range.element.js";

const initial = { from: "2026-05-25", to: "2026-06-23" };

const button = (el: Element) => shadow(el).querySelector("uui-button") as HTMLElement;
const modals = () => [...document.querySelectorAll("uui-modal-dialog")];
const findDialog = () => deepQuery<UauiTestElement>(document, "uaui-date-range-dialog");

const pick = async (dialog: UauiTestElement, name: string, value: string) => {
    const input = deepQuery<HTMLInputElement>(shadow(dialog), `[name='${name}']`)!;
    input.value = value;
    input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    await settle(dialog);
};

const press = (dialog: UauiTestElement, label: string) =>
    [...shadow(dialog).querySelectorAll("uui-button")].find((b) => b.getAttribute("label") === label)!.dispatchEvent(new MouseEvent("click"));

describe("Feature: The date range dialog in the core", () => {
    let el: UauiTestElement;

    /** Focuses the button like an editor's click would, then opens the dialog and waits for it. */
    const openDialog = async () => {
        button(el).focus();
        button(el).click();
        await expect.poll(findDialog).not.toBe(null);
        const dialog = findDialog()!;
        await dialog.updateComplete;
        return dialog;
    };

    const pickJune = async (dialog: UauiTestElement) => {
        await pick(dialog, "from", "2026-06-01");
        await pick(dialog, "to", "2026-06-30");
    };

    beforeEach(async () => {
        el = await renderElement(html`<uaui-date-range .value=${initial} today="2026-07-15"></uaui-date-range>`, "uaui-date-range");
    });

    afterEach(() => modals().forEach((m) => m.remove()));

    describe("Scenario: The button opens a UUI modal dialog", () => {
        // Given a uaui-date-range in the core build
        // When  its button is clicked
        it("a uui-modal-dialog holding the date range dialog is open", async () => {
            await openDialog();
            expect(modals().filter((m) => m.hasAttribute("is-open") && m.querySelector("uaui-date-range-dialog"))).toHaveLength(1);
        });

        it("the modal sits in a uui-modal-container on the body", async () => {
            await openDialog();
            expect(modals()[0].parentElement).toBe(document.body.querySelector(":scope > uui-modal-container"));
        });

        it("a second opening reuses the container", async () => {
            const first = await openDialog();
            press(first, "Close");
            await expect.poll(modals).toHaveLength(0);
            await openDialog();
            expect(document.body.querySelectorAll(":scope > uui-modal-container")).toHaveLength(1);
        });

        it("the open dialog has no accessibility violations", async () => {
            const dialog = await openDialog();
            expect(await axeRun(dialog)).toHaveNoViolations();
        });
    });

    describe("Scenario: Focus moves into the dialog", () => {
        // Given the dialog has just opened
        // When  focus is read
        it("it is inside the dialog", async () => {
            const dialog = await openDialog();
            await expect.poll(() => shadow(dialog).activeElement).not.toBe(null);
        });
    });

    describe("Scenario: Save keeps the new range", () => {
        // Given the dialog is open with 01-06-2026 to 30-06-2026 picked
        // When  Save is clicked
        it('the element\'s value is { from: "2026-06-01", to: "2026-06-30" }', async () => {
            const dialog = await openDialog();
            await pickJune(dialog);
            press(dialog, "Save");
            await expect.poll(() => el.value).toMatchObject({ from: "2026-06-01", to: "2026-06-30" });
        });
    });

    describe("Scenario: Save fires change", () => {
        // Given the dialog is open with a new range picked
        // When  Save is clicked
        it("one change event fires with the new value", async () => {
            const changes = recordEvents(el, "change");
            const dialog = await openDialog();
            await pickJune(dialog);
            press(dialog, "Save");
            await expect.poll(() => changes.map((e) => (e as CustomEvent).detail.value)).toMatchObject([{ from: "2026-06-01", to: "2026-06-30" }]);
        });

        it("the dialog is removed after Save", async () => {
            const dialog = await openDialog();
            press(dialog, "Save");
            await expect.poll(modals).toHaveLength(0);
        });
    });

    describe("Scenario: Focus returns to the button", () => {
        // Given the dialog is open
        // When  it closes by Save, Close or Escape
        it("focus is on the date range button after Save", async () => {
            press(await openDialog(), "Save");
            await expect.poll(() => button(el).matches(":focus")).toBe(true);
        });

        it("focus is on the date range button after Close", async () => {
            press(await openDialog(), "Close");
            await expect.poll(() => button(el).matches(":focus")).toBe(true);
        });

        it("focus is on the date range button after Escape", async () => {
            const dialog = await openDialog();
            await expect.poll(() => shadow(dialog).activeElement).not.toBe(null);
            await userEvent.keyboard("{Escape}");
            await expect.poll(() => button(el).matches(":focus")).toBe(true);
        });
    });

    describe("Sad path", () => {
        describe("Scenario: Close throws away edits", () => {
            // Given the dialog is open with a new range picked
            // When  Close is clicked
            it("the element's value is unchanged", async () => {
                const dialog = await openDialog();
                await pickJune(dialog);
                press(dialog, "Close");
                await expect.poll(modals).toHaveLength(0);
                expect(el.value).toEqual(initial);
            });
        });

        describe("Scenario: Escape throws away edits", () => {
            // Given the dialog is open with a new range picked
            // When  Escape is pressed
            it("no change event fires", async () => {
                const changes = recordEvents(el, "change");
                const dialog = await openDialog();
                await pickJune(dialog);
                await expect.poll(() => shadow(dialog).activeElement).not.toBe(null);
                await userEvent.keyboard("{Escape}");
                await expect.poll(modals).toHaveLength(0);
                expect(changes).toHaveLength(0);
            });

            it("the dialog is removed", async () => {
                const dialog = await openDialog();
                await expect.poll(() => shadow(dialog).activeElement).not.toBe(null);
                await userEvent.keyboard("{Escape}");
                await expect.poll(modals).toHaveLength(0);
            });
        });
    });
});
