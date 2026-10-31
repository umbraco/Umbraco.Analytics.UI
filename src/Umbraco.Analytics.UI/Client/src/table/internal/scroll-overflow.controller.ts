import type { ReactiveController, ReactiveControllerHost } from "@umbraco-cms/backoffice/external/lit";

/**
 * Tells a host whether its scroll area holds more than it can show, sideways. Watches the area and the table inside
 * it with a `ResizeObserver`, since either resizing can start or stop an overflow, and asks the host to update when
 * the answer changes. Internal: the table uses it to make the area keyboard-reachable only while it scrolls.
 */
export class UauiScrollOverflowController implements ReactiveController {
    readonly #host: ReactiveControllerHost & { renderRoot: HTMLElement | DocumentFragment };
    readonly #areaSelector: string;
    readonly #contentSelector: string;
    #observer?: ResizeObserver;
    #overflowing = false;
    #focused = false;

    constructor(host: ReactiveControllerHost & { renderRoot: HTMLElement | DocumentFragment }, areaSelector: string, contentSelector: string) {
        this.#host = host;
        this.#areaSelector = areaSelector;
        this.#contentSelector = contentSelector;
        host.addController(this);
    }

    /** Whether the area's content is wider than the area. */
    get overflowing(): boolean {
        return this.#overflowing;
    }

    /** Whether the area should be a tab stop: while it overflows, and while it has focus so removing it can't drop focus. */
    get focusable(): boolean {
        return this.#overflowing || this.#focused;
    }

    /** The area gained focus. */
    focus() {
        this.#focused = true;
    }

    /** The area lost focus; drops the tab stop kept for it if it no longer overflows. */
    blur() {
        this.#focused = false;
        this.#host.requestUpdate();
    }

    hostConnected() {
        // A reconnect doesn't update the host, so observe again here. On first connect the area isn't rendered yet
        // and this does nothing: `hostUpdated` picks it up.
        if (!this.#observer) this.#observe(true);
    }

    hostUpdated() {
        // The area is in the host's own template, so it is there after the first update.
        if (!this.#observer) this.#observe();
    }

    hostDisconnected() {
        this.#observer?.disconnect();
        this.#observer = undefined;
        // A focused area that is moved gets no blur in some browsers.
        this.#focused = false;
    }

    #observe(measureNow = false) {
        const area = this.#host.renderRoot.querySelector<HTMLElement>(this.#areaSelector);
        if (!area) return;
        const measure = () => {
            const overflowing = area.scrollWidth > area.clientWidth;
            if (overflowing === this.#overflowing) return;
            this.#overflowing = overflowing;
            this.#host.requestUpdate();
        };
        this.#observer = new ResizeObserver(measure);
        this.#observer.observe(area);
        const content = area.querySelector(this.#contentSelector);
        if (content) this.#observer.observe(content);
        // On a reconnect the size may have changed while detached, so don't wait for the next resize.
        if (measureNow) measure();
    }
}
