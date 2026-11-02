// The package's look for a product's own Chart.js charts: colours from the palette, base options and a theme watch.
// They use Chart.js types, so they live in this entry, outside `src/index.ts` and the API report.
// `uaui-time-series-chart` uses them too (through the bare specifier), so its look and a product's can't drift.
// Nothing here reads or changes `Chart.defaults`, `Chart.overrides` or the registry: everything is set per chart.
import type { Chart, ChartOptions, ChartType } from "chart.js";
import { watchTheme } from "./theme-watch.js";

/** The palette for a chart, resolved to real colours (computed `rgb()`/`color()` strings) for the host's current theme. */
export interface UauiChartColors {
    /**
     * The four series slots, in order: `series[0]` is slot 1 (`--uaui-color-series-1`). Use `series[i % 4]` for the
     * `i`th series or slice. `line` is the line, point and border colour; `fill` the area under a line (the fill token
     * at 12% alpha); `bar` an opaque bar or slice.
     */
    series: { line: string; fill: string; bar: string }[];
    /**
     * The status colours, by the status cell's names (`UauiStatusColor`), for a series that carries a meaning: errors in
     * `danger`, approvals in `positive`. Each has the same `line`, `fill` and `bar` as a slot (`--uaui-color-series-danger`
     * and so on). `default` is a neutral grey.
     */
    status: Record<"default" | "positive" | "warning" | "danger", { line: string; fill: string; bar: string }>;
    /** The compare (previous period) line. */
    compare: string;
    /** A compare bar: the compare colour at reduced opacity, drawn behind the current bars. */
    compareBar: string;
    /** Grid lines and axis borders. */
    grid: string;
    /** Axis ticks, legend and other text on the canvas (`--uui-color-text-alt`). */
    text: string;
    /** The surface the chart sits on: use it for hairlines between bars or slices, and hovered point centres. */
    surface: string;
    /** Not a colour: the host's font family (UUI's stack if none can be read), for text drawn on the canvas. */
    fontFamily: string;
}

/** UUI's own font stack (`--uui-font-family`), for when no family can be read from the page. */
const FALLBACK_FONT_FAMILY = '"Lato", "Helvetica Neue", Helvetica, Arial, sans-serif';

/** Chart.js's default events, set per chart so a change to `Chart.defaults.events` doesn't stop hover. */
const EVENTS = ["mousemove", "mouseout", "click", "touchstart", "touchmove"] as const;

const SLOTS = [1, 2, 3, 4];

const STATUSES = ["default", "positive", "warning", "danger"] as const;

const warned = new WeakSet<HTMLElement>();

/**
 * Colours `uaui-time-series-chart` draws beyond `UauiChartColors` (gap shading, hover line, markers; see
 * `src/chart/internal/chart-colors.ts`). Not returned, only compared by `uauiWatchTheme`, so a theme or override that
 * changes only these still reaches our chart's `onChange`, where it compares all of its colours itself.
 */
const CHART_ONLY = [
    "var(--uaui-color-gap-positive)",
    "var(--uaui-color-gap-negative)",
    "var(--uui-color-text)",
    "var(--uaui-color-marker)",
    "var(--uaui-color-marker-hover)",
];

/** Resolves the colours for `host`, and a fingerprint of everything `uauiWatchTheme` compares. */
function resolve(host: HTMLElement, warn: boolean): { colors: UauiChartColors; fingerprint: string } {
    const probe = document.createElement("span");
    probe.hidden = true;
    probe.setAttribute("aria-hidden", "true");
    (host.shadowRoot ?? host).append(probe);
    try {
        const style = getComputedStyle(probe);
        if (warn && !warned.has(host)) {
            const problem = !host.isConnected
                ? "is not connected, so its colours are empty. Call it once the element is connected"
                : !style.getPropertyValue("--uaui-color-series-1")
                  ? "has no palette tokens. Add UauiPaletteStyles to its styles"
                  : undefined;
            if (problem) {
                warned.add(host);
                console.warn(`[uaui] uauiChartColors: <${host.localName}> ${problem}.`);
            }
        }
        const colorOf = (expression: string): string => {
            probe.style.color = "";
            probe.style.color = expression;
            return style.color;
        };
        const shadesOf = (key: number | string) => ({
            line: colorOf(`var(--uaui-color-series-${key})`),
            fill: colorOf(`color-mix(in srgb, var(--uaui-color-fill-${key}) 12%, transparent)`),
            bar: colorOf(`var(--uaui-color-bar-${key})`),
        });
        const colors: UauiChartColors = {
            series: SLOTS.map(shadesOf),
            status: Object.fromEntries(STATUSES.map((status) => [status, shadesOf(status)])) as UauiChartColors["status"],
            compare: colorOf("var(--uaui-color-compare)"),
            compareBar: colorOf("var(--uaui-color-compare-bar)"),
            grid: colorOf("var(--uui-color-divider-standalone)"),
            text: colorOf("var(--uui-color-text-alt)"),
            surface: colorOf("var(--uui-color-surface)"),
            // Never empty: an empty family would let Chart.js fall back to the shared `Chart.defaults.font.family`.
            fontFamily: style.fontFamily || FALLBACK_FONT_FAMILY,
        };
        return { colors, fingerprint: JSON.stringify([colors, CHART_ONLY.map(colorOf)]) };
    } finally {
        probe.remove();
    }
}

/**
 * The package's chart colours for `host`, in its current theme (light, dark or high contrast) and with any
 * `--uaui-series-N` (and other palette) overrides from its ancestors.
 *
 * A canvas can't read CSS custom properties, and the palette tokens are `light-dark(...)` strings, not colours. So a
 * hidden probe is put in `host`'s shadow root, each colour is applied to it and read back as a computed `color`, and
 * the probe is removed. `host` should be a custom element with a shadow root (without one, the probe goes in its light
 * DOM for the call, where a `slotchange` or mutation observer of yours would see it). It must be connected (else the
 * colours are empty) and have `UauiPaletteStyles` in its styles, which is where the `--uaui-color-*` tokens are
 * resolved. Either mistake is warned about once per host.
 */
export function uauiChartColors(host: HTMLElement): UauiChartColors {
    return resolve(host, true).colors;
}

/** Types drawn without axes, and types with one radial axis. Every other type (custom ones too) gets `x` and `y`. */
const NO_AXES = new Set<string>(["doughnut", "pie"]);
const RADIAL = new Set<string>(["radar", "polarArea"]);

/**
 * Base Chart.js options with the package's look, for a chart of `type`: our font (the host's, at our sizes), grid,
 * axis and tick colours, legend and title off, responsive, no animation. Spread it into your chart's `options` and
 * set your own on top (spread a nested object too when you change part of it, e.g. `plugins`).
 *
 * Everything is set on the returned object, so `Chart.defaults` (which every product shares) never shows through,
 * and nothing is read from it. Axes match `uaui-time-series-chart`: `x` (the category axis) has a border and no grid
 * lines, `y` grid lines and no border. A doughnut or pie gets no `scales` (Chart.js would draw any it's given);
 * radar and polar area get `r`.
 *
 * `colors` defaults to `uauiChartColors(host)`; pass it when you already resolved them for your datasets.
 * Returns a new object each call.
 */
export function uauiChartOptions<TType extends ChartType>(
    host: HTMLElement,
    type: TType,
    colors: UauiChartColors = uauiChartColors(host),
): ChartOptions<TType> {
    // The whole font, not just family and size, so `Chart.defaults.font` can't restyle any part of it.
    const font = () => ({ family: colors.fontFamily, size: 11, style: "normal" as const, weight: "normal" as const, lineHeight: 1.2 });
    const ticks = () => ({
        display: true,
        color: colors.text,
        font: font(),
        align: "center" as const,
        crossAlign: "near" as const,
        mirror: false,
        minRotation: 0,
        autoSkipPadding: 3,
        showLabelBackdrop: false,
        textStrokeWidth: 0,
    });
    const axis = () => ({ reverse: false, grace: 0 });
    const border = () => ({ dash: [], dashOffset: 0 });

    let scales: Record<string, object> | undefined;
    if (RADIAL.has(type)) {
        scales = {
            r: {
                ...axis(),
                grid: { display: true, color: colors.grid, lineWidth: 1 },
                angleLines: { display: true, color: colors.grid, lineWidth: 1 },
                pointLabels: { display: true, color: colors.text, font: font() },
                ticks: { ...ticks(), backdropColor: colors.surface },
            },
        };
    } else if (!NO_AXES.has(type)) {
        scales = {
            x: {
                ...axis(),
                position: "bottom",
                grid: { display: false, lineWidth: 1, tickLength: 8 },
                border: { ...border(), display: true, color: colors.grid, width: 1 },
                ticks: { ...ticks(), padding: 3, maxRotation: 45, autoSkip: true },
            },
            y: {
                ...axis(),
                position: "left",
                grid: { display: true, color: colors.grid, lineWidth: 1, tickLength: 8, drawTicks: false },
                border: { ...border(), display: false },
                ticks: { ...ticks(), padding: 8 },
            },
        };
    }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        events: [...EVENTS],
        color: colors.text,
        borderColor: colors.grid,
        font: font(),
        elements: {
            // A surface-coloured hairline between slices, as between our stacked bars.
            arc: { borderColor: colors.surface, borderWidth: 2 },
        },
        plugins: {
            legend: { display: false, labels: { color: colors.text, font: font() } },
            title: { display: false, color: colors.text, font: { ...font(), size: 13, weight: "bold" as const } },
            subtitle: { display: false, color: colors.text, font: font() },
            // Chart.js's canvas tooltip, in our font. Whether it shows is yours to set (`enabled`): another product may
            // have registered it.
            tooltip: { titleFont: { ...font(), weight: "bold" as const }, bodyFont: font(), footerFont: font() },
        },
        ...(scales ? { scales } : {}),
    };
    return options as unknown as ChartOptions<TType>;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Where a colour or font changed between `before` and `after` (two builds of our options), sets the new value in
 * `target` (a chart's own options), but only where `target` still holds our old one: an option the product set itself
 * is left alone.
 */
function replaceLook(target: Record<string, unknown>, before: Record<string, unknown>, after: Record<string, unknown>) {
    for (const [key, next] of Object.entries(after)) {
        const previous = before[key];
        const current = target[key];
        if (isObject(next) && isObject(previous)) {
            if (isObject(current)) replaceLook(current, previous, next);
        } else if (typeof next === "string" && next !== previous && current === previous) {
            target[key] = next;
        }
    }
}

/**
 * Keeps `chart` in the package's colours when the backoffice theme changes. When a stylesheet in the document head
 * changes (how a theme switch looks from here), it resolves `uauiChartColors(host)` again; if the theme's colours
 * changed, it puts the new colours in place of the old in the chart's options (where they are still ours, as
 * `uauiChartOptions` set them), calls `onChange` so you can recolour your datasets, then `chart.update()`.
 *
 * Start it right after creating the chart, with the colours its options were built with still current. A change while
 * `host` is disconnected (or a watch started then) is applied when the chart's canvas is laid out again after
 * reconnecting, or at the next stylesheet change; no timer runs meanwhile. It stops itself once `chart` is destroyed.
 * All watches on a page share one observer, which holds on to `host` and `chart` until you stop the watch or destroy
 * the chart: do one of them when you are done with it.
 *
 * @returns a function that stops watching. Call it when your element disconnects; calling it again is harmless.
 */
export function uauiWatchTheme<TType extends ChartType, TData, TLabel>(
    host: HTMLElement,
    chart: Chart<TType, TData, TLabel>,
    onChange?: (colors: UauiChartColors, chart: Chart<TType, TData, TLabel>) => void,
): () => void {
    // Disconnected, the colours resolve empty, which is what options built then hold: the first check replaces them.
    let last = resolve(host, false);
    let stopped = false;
    /**
     * While a check waits for the host to come back: watches the canvas' size, which is reported as 0 while it is out of
     * the document and as its real size once it is laid out again. Only exists while waiting.
     */
    let reconnect: ResizeObserver | undefined;
    const stopWaiting = () => {
        reconnect?.disconnect();
        reconnect = undefined;
    };
    const stop = () => {
        if (stopped) return;
        stopped = true;
        stopWaiting();
        stopWatching();
    };
    const check = () => {
        if (stopped) return;
        // Chart.js clears `canvas` when a chart is destroyed.
        if (!chart.canvas) return stop();
        if (!host.isConnected) {
            if (!reconnect) {
                reconnect = new ResizeObserver(() => {
                    if (host.isConnected) check();
                });
                reconnect.observe(chart.canvas);
            }
            return;
        }
        stopWaiting();
        const next = resolve(host, false);
        if (next.fingerprint === last.fingerprint) return;
        // The chart's own options, as its config holds them (not the resolved `chart.options`).
        const config = chart.config as unknown as { type: ChartType; options?: Record<string, unknown> };
        if (config.options) {
            const before = uauiChartOptions(host, config.type, last.colors) as Record<string, unknown>;
            replaceLook(config.options, before, uauiChartOptions(host, config.type, next.colors) as Record<string, unknown>);
        }
        last = next;
        onChange?.(next.colors, chart);
        chart.update();
    };
    const stopWatching = watchTheme(check);
    // Started while disconnected: catch up once it is back, theme change or not.
    if (!host.isConnected) check();
    return stop;
}
