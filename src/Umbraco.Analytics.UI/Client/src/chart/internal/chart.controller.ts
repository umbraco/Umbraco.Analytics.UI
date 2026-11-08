import type { ReactiveController } from "#platform/lit";
import type { UauiLitElement } from "#platform/base-element";
import type { Plugin } from "#platform/chart";
import { clashingColors, colorsDiffer, resolveChartColors, type UauiChartDrawColors, type UauiSeriesColorKey } from "./chart-colors.js";
import { UauiChartRenderer, type UauiChartHover } from "./chart-renderer.js";
import type { UauiChartTooltipElement } from "./chart-tooltip.element.js";
import { clampInside, placeTooltip } from "./place-tooltip.js";

/** What the controller asks of its chart element. */
export interface UauiChartControllerOptions {
    /** What each drawn series is coloured by, in series order. */
    colorKeys: () => UauiSeriesColorKey[];
    /** Hands the renderer the chart's model, drawn in `colors`. Called when the chart is invalid, and on a theme change. */
    draw: (renderer: UauiChartRenderer, colors: UauiChartDrawColors) => void;
    /** The chart's own Chart.js plugins, made afresh for each Chart.js chart (see `UauiChartRenderer`). */
    plugins?: () => Plugin[];
}

/**
 * Owns a chart element's Chart.js chart, through `UauiChartRenderer`: creates it on the first update that has the
 * canvas, draws it when `invalidate` was called, watches the theme (`uauiWatchTheme`) and redraws in its new colours,
 * redraws once web fonts have loaded, destroys it on disconnect and builds it again on reconnect. Holds the hover too:
 * the x value the pointer is on, which Escape dismisses (WCAG 1.4.13), and places the hover tooltip beside it.
 *
 * Expects the element's shadow root to have a `canvas`, a hidden `.probe` (for `resolveChartColors`), a `.plot` and,
 * while hovering, a `uaui-chart-tooltip` in it: `renderChartFrame` renders all but the tooltip. Plugins are per chart:
 * no `Chart.defaults` change and no global `Chart.register` here (see `chart-renderer.ts` and `register.ts`).
 * Internal: not exported.
 */
export class UauiChartController implements ReactiveController {
    readonly #host: UauiLitElement;
    readonly #options: UauiChartControllerOptions;
    #renderer?: UauiChartRenderer;
    #colors?: UauiChartDrawColors;
    #hover?: UauiChartHover;
    #hoverDismissed = false;
    /** The chart needs drawing: its data, kind or look changed. */
    #dirty = true;
    #warned = new Set<string>();

    constructor(host: UauiLitElement, options: UauiChartControllerOptions) {
        this.#host = host;
        this.#options = options;
        host.addController(this);
    }

    /** The x value the pointer is on, and where to anchor the tooltip; `undefined` when none or dismissed with Escape. */
    get hover(): UauiChartHover | undefined {
        return this.#hoverDismissed ? undefined : this.#hover;
    }

    /** Whether the Chart.js chart exists (the element is connected and has rendered its canvas). */
    get created(): boolean {
        return !!this.#renderer;
    }

    /** Draws the chart at the next update: call it when anything the model is built from changed. */
    invalidate(): void {
        this.#dirty = true;
    }

    /** Draws again without relayout, after one of the chart's plugins changed its state. */
    draw(): void {
        this.#renderer?.draw();
    }

    /** Warns once per chart, naming the element: `[uaui] <tag>: <message>`. */
    warnOnce(id: string, message: string): void {
        if (this.#warned.has(id)) return;
        this.#warned.add(id);
        console.warn(`[uaui] ${this.#host.localName}: ${message}`);
    }

    hostConnected(): void {
        document.addEventListener("keydown", this.#onDocumentKeydown);
        // On reconnect the first render has already happened, so rebuild the chart in `hostUpdated`.
        if (this.#host.hasUpdated) this.#host.requestUpdate();
    }

    hostDisconnected(): void {
        this.#renderer?.destroy();
        this.#renderer = undefined;
        this.#colors = undefined;
        this.#setHover(undefined);
        document.removeEventListener("keydown", this.#onDocumentKeydown);
    }

    hostUpdated(): void {
        this.#sync();
        if (this.#hover) void this.#placeTooltip();
    }

    #setHover(hover: UauiChartHover | undefined) {
        const changed = hover !== this.#hover || this.#hoverDismissed;
        this.#hoverDismissed = false;
        this.#hover = hover;
        if (changed) this.#host.requestUpdate();
    }

    /** WCAG 1.4.13: Escape hides the hover tooltip without moving the pointer; `uaui-chart-markers` does the same for its own. */
    #onDocumentKeydown = (e: KeyboardEvent) => {
        if (e.key !== "Escape" || !this.#hover || this.#hoverDismissed) return;
        this.#hoverDismissed = true;
        this.#host.requestUpdate();
    };

    get #canvas() {
        return this.#host.shadowRoot?.querySelector<HTMLCanvasElement>("canvas") ?? undefined;
    }

    get #probe() {
        return this.#host.shadowRoot?.querySelector<HTMLElement>(".probe") ?? undefined;
    }

    /** Creates the chart if it doesn't exist, and draws it when it is invalid. */
    #sync() {
        const canvas = this.#canvas;
        const probe = this.#probe;
        // An update already queued can run after disconnect: build nothing then, as nothing would destroy it.
        // Reconnecting asks for an update, which draws.
        if (!canvas || !probe || !this.#host.isConnected) return;

        if (!this.#renderer) {
            this.#renderer = new UauiChartRenderer(
                canvas,
                this.#host,
                (hover) => this.#setHover(hover),
                // The renderer watches the theme with `uauiWatchTheme`, as a product's chart does.
                () => this.#syncColors(),
                this.#options.plugins,
            );
            this.#dirty = true;
            // Axis text is measured with the web font, so redraw once fonts have settled.
            document.fonts?.ready.then(() => this.#renderer?.redraw());
        }
        if (!this.#dirty) return;
        this.#dirty = false;
        this.#colors = resolveChartColors(this.#host, probe, this.#options.colorKeys());
        this.#draw();
    }

    #draw() {
        if (!this.#renderer || !this.#colors) return;
        this.#warnColorClash(this.#colors);
        this.#options.draw(this.#renderer, this.#colors);
    }

    /** Warns once per chart when a status series draws like a slot series beside it (warning and slot 3, danger and slot 2). */
    #warnColorClash(colors: UauiChartDrawColors) {
        if (this.#warned.has("color-clash")) return;
        const clashes = clashingColors(this.#options.colorKeys(), colors.series);
        if (!clashes.length) return;
        const pairs = clashes.map(([status, slot]) => `"${status}" and ${slot}`).join(", ");
        this.warnOnce("color-clash", `series colours ${pairs} look the same in this theme. Use another slot or status.`);
    }

    /** Redraws with the theme's current colours, if they changed. Called by the renderer's theme watch. */
    #syncColors() {
        const probe = this.#probe;
        if (!probe || !this.#renderer) return;
        const colors = resolveChartColors(this.#host, probe, this.#options.colorKeys());
        if (!colorsDiffer(this.#colors, colors)) return;
        this.#colors = colors;
        this.#draw();
    }

    /** Puts the tooltip beside the hovered point, on the side with room, kept inside the plot. */
    async #placeTooltip() {
        const tip = this.#host.shadowRoot?.querySelector<UauiChartTooltipElement>("uaui-chart-tooltip");
        const plot = this.#host.shadowRoot?.querySelector<HTMLElement>(".plot");
        if (!tip || !plot) return;
        await placeTooltip(tip, ({ width, height }) => {
            const hover = this.#hover;
            if (!hover) return undefined;
            const gap = 14;
            const left = hover.x + gap + width > plot.clientWidth ? hover.x - gap - width : hover.x + gap;
            return { left: Math.max(left, 0), top: clampInside(hover.y - height - 8, height, plot.clientHeight) };
        });
    }
}
