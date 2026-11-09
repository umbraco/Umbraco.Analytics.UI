import type { ReactiveController, ReactiveControllerHost } from "#platform/lit";

/** What a `UauiWrapController` measures: a row, and two items in it that wrap onto a new line when they don't both fit. */
export interface UauiWrapTargets {
    row: HTMLElement;
    first: HTMLElement;
    second: HTMLElement;
    /** Elements whose own text draws a microtask after the host's, so the widths of `first` and `second` are only real once these have updated. */
    settle?: ReadonlyArray<{ updateComplete?: Promise<unknown> } | null | undefined>;
}

/**
 * Tells a host whether two items in a row no longer fit side by side, so it can pick a layout for the wrapped case. The
 * browser can't tell a grid to wrap, so this measures: the widths of both items and the row's column gap against the
 * row's width. Watches the three with a `ResizeObserver` and asks the host to update when the answer changes. Internal:
 * the KPI tile uses it to move its badge below the value and line.
 */
export class UauiWrapController implements ReactiveController {
    readonly #host: ReactiveControllerHost;
    readonly #targets: () => UauiWrapTargets | null;
    #observer?: ResizeObserver;
    #observed: Element[] = [];
    #frame = 0;
    #wrapped = false;

    /** @param targets What to measure now, or null when there is nothing to measure (no observer is kept then). */
    constructor(host: ReactiveControllerHost, targets: () => UauiWrapTargets | null) {
        this.#host = host;
        this.#targets = targets;
        host.addController(this);
    }

    /** Whether the second item no longer fits beside the first. */
    get wrapped(): boolean {
        return this.#wrapped;
    }

    hostConnected() {
        // A reconnect: the size may have changed while detached, and the host doesn't update until something changes.
        // On first connect nothing is rendered yet, so this finds no targets and does nothing.
        this.#sync();
    }

    hostUpdated() {
        this.#sync();
    }

    hostDisconnected() {
        cancelAnimationFrame(this.#frame);
        this.#observer?.disconnect();
        this.#observer = undefined;
        this.#observed = [];
    }

    #sync() {
        const targets = this.#targets();
        if (!targets) {
            this.#observer?.disconnect();
            this.#observed = [];
            this.#set(false);
            return;
        }
        const nodes = [targets.row, targets.first, targets.second];
        // Measured next frame: a change of layout moves the row's height, and measuring inside the callback would make the
        // browser report a ResizeObserver loop.
        if (!this.#observer) this.#observer = new ResizeObserver(() => this.#measureSoon());
        if (nodes.length !== this.#observed.length || nodes.some((node, index) => node !== this.#observed[index])) {
            this.#observer.disconnect();
            nodes.forEach((node) => this.#observer!.observe(node));
            this.#observed = nodes;
        }
        void Promise.all((targets.settle ?? []).map((part) => part?.updateComplete)).then(() => this.#measure());
    }

    // During a live resize, one frame paints in the old layout before the next-frame measurement lands.
    #measureSoon() {
        cancelAnimationFrame(this.#frame);
        this.#frame = requestAnimationFrame(() => this.#measure());
    }

    // The browser's own wrap test: both items and the gap against the row. The items are max-content wide in both
    // layouts, so the answer doesn't depend on the layout it picks.
    #measure() {
        const [row, first, second] = this.#observed;
        if (!row?.isConnected) return;
        const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
        this.#set(first.getBoundingClientRect().width + gap + second.getBoundingClientRect().width > row.getBoundingClientRect().width);
    }

    #set(wrapped: boolean) {
        if (wrapped === this.#wrapped) return;
        this.#wrapped = wrapped;
        this.#host.requestUpdate();
    }
}
