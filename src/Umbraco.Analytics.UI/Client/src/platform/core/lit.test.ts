import { afterEach, describe, expect, it } from "vitest";
import * as platformLit from "#platform/lit";
import { LitElement, customElement, html } from "#platform/lit";

@customElement("uaui-core-lit-probe")
class ProbeElement extends LitElement {
    override render() {
        return html`<p>probe</p>`;
    }
}

describe("#platform/lit in the core build", () => {
    afterEach(() => document.body.replaceChildren());

    it("renders an element built from html and LitElement", async () => {
        const el = new ProbeElement();
        document.body.append(el);
        await el.updateComplete;
        expect(el.shadowRoot?.querySelector("p")?.textContent).toBe("probe");
    });

    it("exports every value src imports from #platform/lit", () => {
        const used = ["LitElement", "css", "customElement", "html", "ifDefined", "nothing", "property", "query", "repeat", "state"];
        expect(used.filter((name) => !(name in platformLit))).toEqual([]);
    });
});
