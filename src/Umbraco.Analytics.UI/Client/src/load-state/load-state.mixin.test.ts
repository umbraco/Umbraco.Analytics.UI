// T60 — UauiLoadStateMixin: the load states the charts, the funnel and the table share. Attribute names, reflection and
// defaults, the error > loading > empty rule, and one `retry` event. Type checks run in `tsc -p tsconfig.app.json`.
import { describe, expect, expectTypeOf, it } from "vitest";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UauiLoadStateMixin, type UauiLoadingMode } from "./load-state.mixin.js";

class ProductBase extends UmbLitElement {
    productSetting = "kept";
}

/** Exposes the protected helpers, as an element's render would use them. */
class TestLoadStateElement extends UauiLoadStateMixin(ProductBase) {
    mode(hasData: boolean): UauiLoadingMode {
        return this.loadingMode(hasData);
    }
    busy(): boolean {
        return this.isBusy();
    }
    retry(): void {
        this.dispatchRetry();
    }
}
customElements.define("uaui-test-load-state", TestLoadStateElement);

const create = async (attributes: Record<string, string> = {}) => {
    const el = new TestLoadStateElement();
    for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
    document.body.append(el);
    await el.updateComplete;
    return el;
};

describe("Feature: the load state mixin", () => {
    it("keeps the base class's own members, in the type and at runtime", async () => {
        const el = await create();
        expectTypeOf(el.productSetting).toEqualTypeOf<string>();
        expect(el.productSetting).toBe("kept");
        el.remove();
    });

    it("defaults to not loading, no error, no Retry and no texts", async () => {
        const el = await create();
        expect([el.loading, el.error, el.retryable]).toEqual([false, false, false]);
        expect([el.errorHeadline, el.errorDescription, el.emptyHeadline, el.emptyDescription]).toEqual([undefined, undefined, undefined, undefined]);
        el.remove();
    });

    it("reads the shared attribute names, and reflects loading and error", async () => {
        const el = await create({
            "error-headline": "a",
            "error-description": "b",
            "empty-headline": "c",
            "empty-description": "d",
            retryable: "",
        });
        expect([el.errorHeadline, el.errorDescription, el.emptyHeadline, el.emptyDescription, el.retryable]).toEqual(["a", "b", "c", "d", true]);
        el.loading = true;
        el.error = true;
        el.retryable = false;
        await el.updateComplete;
        expect(el.hasAttribute("loading")).toBe(true);
        expect(el.hasAttribute("error")).toBe(true);
        // `retryable` isn't reflected, as before.
        expect(el.hasAttribute("retryable")).toBe(true);
        el.remove();
    });

    it("lets error win over loading, and loading over empty", async () => {
        const el = await create();
        expect([el.mode(false), el.mode(true), el.busy()]).toEqual(["idle", "idle", false]);
        el.loading = true;
        expect([el.mode(false), el.mode(true), el.busy()]).toEqual(["skeleton", "reload", true]);
        el.error = true;
        expect([el.mode(false), el.mode(true), el.busy()]).toEqual(["idle", "idle", false]);
        el.remove();
    });

    it("raises retry as a plain event that bubbles, is not composed and can't be canceled", async () => {
        const el = await create();
        const seen: Event[] = [];
        document.body.addEventListener("retry", (e) => seen.push(e), { once: true });
        el.retry();
        expect(seen).toHaveLength(1);
        const [event] = seen;
        expect(event.constructor).toBe(Event);
        expect([event.bubbles, event.composed, event.cancelable]).toEqual([true, false, false]);
        el.remove();
    });
});
