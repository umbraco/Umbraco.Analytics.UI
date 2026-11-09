// SAC-3 AC1–AC4 — standalone core package.
// A real uaui-date-range opens its dialog through a real modal manager (uaui-test-modal-host provides one and the
// backoffice's modal container), so the whole path button -> opener -> modal -> dialog -> value is exercised.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { html } from "#platform/lit";
import { UMB_MODAL_MANAGER_CONTEXT, type UmbModalContext } from "@umbraco-cms/backoffice/modal";
import { deepQuery, recordEvents, settle, shadow, type UauiTestElement } from "../../internal/test/dom.js";
import { renderWithModals } from "./test-modal-host.js";
import "../../date-range/date-range.element.js";

const initial = { from: "2026-05-25", to: "2026-06-23" };

type Subject = { el: UauiTestElement; modals: () => UmbModalContext[] };

type ModalManager = { modals: { subscribe: (cb: (modals: UmbModalContext[]) => void) => { unsubscribe: () => void } } };
type ContextConsumer = { consumeContext: (token: unknown, cb: (manager: ModalManager | undefined) => void) => void };

const subscriptions: Array<{ unsubscribe: () => void }> = [];
afterEach(() => subscriptions.splice(0).forEach((s) => s.unsubscribe()));

/** Reports the modals open in the host's manager, and stops listening after the test. */
const observeModals = (el: Element, onChange: (modals: UmbModalContext[]) => void) =>
    (el.parentElement as unknown as ContextConsumer).consumeContext(UMB_MODAL_MANAGER_CONTEXT, (manager) => {
        if (manager) subscriptions.push(manager.modals.subscribe(onChange));
    });

/** A uaui-date-range under a modal host, plus a view of the modals the host's manager has open. */
const arrange = async (): Promise<Subject> => {
    const el = await renderWithModals(html`<uaui-date-range .value=${initial}></uaui-date-range>`, "uaui-date-range");
    let open: UmbModalContext[] = [];
    observeModals(el, (modals) => (open = modals));
    return { el, modals: () => open };
};

const clickButton = (el: Element) => (shadow(el).querySelector("uui-button") as HTMLElement).click();

const openDialog = async (el: UauiTestElement) => {
    clickButton(el);
    await expect.poll(() => deepQuery<UauiTestElement>(document, "uaui-date-range-dialog")).not.toBe(null);
    const dialog = deepQuery<UauiTestElement>(document, "uaui-date-range-dialog")!;
    await dialog.updateComplete;
    return dialog;
};

const pick = async (dialog: UauiTestElement, name: string, value: string) => {
    const input = deepQuery<HTMLInputElement>(shadow(dialog), `[name='${name}']`)!;
    input.value = value;
    input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    await settle(dialog);
};

const press = (dialog: UauiTestElement, label: string) =>
    [...shadow(dialog).querySelectorAll("uui-button")].find((b) => b.getAttribute("label") === label)!.dispatchEvent(new MouseEvent("click"));

describe("Feature: The date range dialog in the backoffice", () => {
    describe("Scenario: The button opens the dialog through the modal manager", () => {
        let subject: Subject;
        beforeEach(async () => {
            subject = await arrange();
            await openDialog(subject.el);
        });

        it("the modal manager has one open modal with alias Uaui.Modal.DateRange", () => {
            expect(subject.modals().map((m) => m.alias.toString())).toEqual(["Uaui.Modal.DateRange"]);
        });
    });

    describe("Scenario: Save keeps the new range", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            ({ el } = await arrange());
            const dialog = await openDialog(el);
            await pick(dialog, "from", "2026-06-01");
            await pick(dialog, "to", "2026-06-30");
            press(dialog, "Save");
            await expect.poll(() => (el.value as { from: string }).from).toBe("2026-06-01");
        });

        it('the element\'s value is { from: "2026-06-01", to: "2026-06-30" }', () => {
            expect(el.value).toMatchObject({ from: "2026-06-01", to: "2026-06-30" });
        });
    });

    describe("Scenario: Save fires change", () => {
        let events: Event[];
        beforeEach(async () => {
            const { el } = await arrange();
            events = recordEvents(el, "change");
            const dialog = await openDialog(el);
            await pick(dialog, "from", "2026-06-01");
            press(dialog, "Save");
            await expect.poll(() => events.length).toBe(1);
        });

        it("one change event fires with the new value", () => {
            expect((events[0] as CustomEvent).detail.value).toMatchObject({ from: "2026-06-01", to: "2026-06-23" });
        });
    });

    describe("Sad path", () => {
        describe("Scenario: Close throws away edits", () => {
            let el: UauiTestElement;
            beforeEach(async () => {
                ({ el } = await arrange());
                const dialog = await openDialog(el);
                await pick(dialog, "from", "2026-06-01");
                press(dialog, "Close");
                await expect.poll(() => deepQuery(document, "uaui-date-range-modal")).toBe(null);
            });

            it("the element's value is unchanged", () => {
                expect(el.value).toEqual(initial);
            });
        });
    });
});
