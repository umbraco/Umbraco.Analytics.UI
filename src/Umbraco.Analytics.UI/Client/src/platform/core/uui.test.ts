import { describe, expect, it } from "vitest";
import * as platformUui from "#platform/uui";
import { UUIButtonElement } from "#platform/uui";

describe("#platform/uui in the core build", () => {
    it("defines uui-button", () => {
        expect(customElements.get("uui-button")).toBe(UUIButtonElement);
    });

    it("exports UUITextStyles", () => {
        expect("UUITextStyles" in platformUui).toBe(true);
    });
});
