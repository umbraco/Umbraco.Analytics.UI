import type { ReactiveController, ReactiveControllerHost } from "@umbraco-cms/backoffice/external/lit";

/** Plain elements that draw something without children of their own, such as an image or a form control. */
const SELF_DRAWING_TAGS = new Set(["img", "input", "select", "textarea", "video", "audio", "canvas", "iframe", "object", "embed", "picture", "hr", "meter", "progress"]);

const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";

/**
 * Whether a slotted element has something to show. A plain HTML element with no element children and only whitespace
 * text, such as an empty live region kept mounted for later, has nothing. Anything that can draw itself counts as
 * content whatever its children: a custom element (it draws from its attributes, even before it upgrades), a forwarded
 * `<slot>`, an element with its own shadow root, an image or form control, and SVG or MathML.
 */
export function hasSlotContent(element: Element): boolean {
    if (element.namespaceURI !== HTML_NAMESPACE) return true;
    // A forwarded `<slot>` (a product wrapping the table) passes on whatever the product's own page slots into it.
    if (element.localName === "slot" || element.localName.includes("-") || element.shadowRoot) return true;
    if (SELF_DRAWING_TAGS.has(element.localName)) return true;
    return element.childElementCount > 0 || (element.textContent ?? "").trim() !== "";
}

/**
 * Asks a host to update when what its slotted content shows changes, not only when elements are slotted or removed:
 * text typed into, or cleared from, an element that stays slotted raises no `slotchange`. Watches the host's light DOM
 * with a `MutationObserver` while connected, and compares `state()` (the host's own summary of which slots have
 * content) so other changes inside slotted content don't redraw the host. Internal: the table uses it so an empty
 * live region in its footer or toolbar slots hides the row until it has text.
 */
export class UauiSlotContentController implements ReactiveController {
    readonly #host: ReactiveControllerHost & HTMLElement;
    readonly #state: () => string;
    #observer?: MutationObserver;
    #last = "";

    constructor(host: ReactiveControllerHost & HTMLElement, state: () => string) {
        this.#host = host;
        this.#state = state;
        host.addController(this);
    }

    hostConnected() {
        this.#observer ??= new MutationObserver(() => this.#check());
        this.#observer.observe(this.#host, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["slot"] });
        // Content may have changed while detached, so look again now.
        this.#check();
    }

    hostDisconnected() {
        this.#observer?.disconnect();
    }

    #check() {
        const state = this.#state();
        if (state === this.#last) return;
        this.#last = state;
        this.#host.requestUpdate();
    }
}
