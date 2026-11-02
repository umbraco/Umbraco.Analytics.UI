import {
    Chart,
    registry,
    uauiChartOptions,
    uauiWatchTheme,
    type CartesianScaleOptions,
    type ChartConfiguration,
    type PointElement,
    type Plugin,
} from "@umbraco/analytics-ui/external/chart.js";
import type { UauiChartKind, UauiSeriesKind } from "../types.js";
import type { UauiChartDrawColors } from "./chart-colors.js";
import "./register.js";

/** What the renderer draws. Our own shape: Chart.js types stay inside `src/chart/internal`. */
export interface UauiChartModel {
    /** `area` fills the lines; `stacked-bar` stacks the bars. Each dataset says whether it is a line or bars. */
    kind: UauiChartKind;
    labels: string[];
    /** A line's `compare` is drawn as a dashed line, with the gap to `values` shaded. Bars have none. */
    datasets: { label: string; kind: UauiSeriesKind; values: (number | null)[]; compare?: (number | null)[] }[];
    /** When there are bars, one compare bar per x value, drawn behind the current bars. */
    compareTotal?: (number | null)[];
    /** The y-axis runs from 0 to `yMax` in steps of `yStep`, unless `yTicks` is given. */
    yMax: number;
    yStep: number;
    formatTick: (value: number) => string;
    /** Ticks at these heights (from 0 to `yMax`) with these labels, in place of `yStep` and `formatTick`: the log axis. */
    yTicks?: { value: number; label: string }[];
    /** Extra room above the plot, in pixels, for what the chart's own plugins draw there (the time-series chart's today label). */
    roomAbove?: number;
    colors: UauiChartDrawColors;
    /** Line kinds: a series below its compare line is doing better, so the gap shading flips. */
    lowerIsBetter?: boolean;
    /**
     * The share view: `values` are shares (0 to 1) and every dataset stacks, lines too. Lines are drawn as bands, each
     * filled down to the one below in its bar colour with a surface hairline on top, as stacked bar segments are. A gap
     * (`null`, a date whose total is 0) is left empty rather than bridged.
     */
    share?: boolean;
}

/** The x value (date or category) the pointer is on, and where to anchor a tooltip (canvas pixels). */
export interface UauiChartHover {
    index: number;
    x: number;
    y: number;
}

/** Widest a bar gets on a chart with few points, in pixels. The compare bar is a little wider than the current bars. */
const MAX_BAR_WIDTH = 28;
const COMPARE_BAR_EXTRA_WIDTH = 12;

/**
 * Chart.js is shared with the products (`@umbraco/analytics-ui/external/chart.js`), so its registry and `Chart.defaults`
 * are too. Our chart sets everything it relies on per chart, so a product's global registrations and defaults don't
 * change it: every registered plugin but these, and the chart's own plugins passed to the renderer, is off for our chart.
 */
const OWN_PLUGINS = ["filler", "tooltip", "uauiHoverLine"];

/** Whether `id` is a plugin in the shared registry. Chart.js doesn't type `items`, so read it with care. */
const isRegisteredPlugin = (id: string): boolean =>
    Object.prototype.hasOwnProperty.call((registry.plugins as unknown as { items?: object }).items ?? {}, id);

/**
 * Wraps a chart's `options.plugins` so it answers `false` (off) for every registered plugin we don't use. Chart.js asks
 * each time it rebuilds a chart's plugin list (every update and resize), so a plugin a product registers globally,
 * even after our chart was drawn, never runs on our chart.
 */
const onlyOwnPlugins = <T extends object>(plugins: T, own: ReadonlySet<string>): T =>
    new Proxy(plugins, {
        get: (target, key, receiver) =>
            typeof key === "string" && !own.has(key) && !Object.prototype.hasOwnProperty.call(target, key) && isRegisteredPlugin(key)
                ? false
                : Reflect.get(target, key, receiver),
    });

/**
 * Where a line may draw past the chart area, set per dataset so a product's `Chart.defaults.clip` can't let our lines
 * and fills spill over the axes. It is the clip Chart.js works out itself (`LineController.getMaxOverflow`): none above
 * or below, as the y-axis has a fixed min and max; at the sides, half the widest of the line and its end dots, a dot
 * counting at its hover radius, with the line's width as its border.
 */
const lineClip = (borderWidth: number, pointRadius: number, pointHoverRadius: number) => {
    const dot = pointRadius ? (Math.max(pointRadius, pointHoverRadius) + borderWidth) * 2 : 0;
    const side = Math.max(borderWidth, dot) / 2;
    return { top: 0, bottom: 0, left: side, right: side };
};

/** The least room a y tick label gets, in pixels: the 11px tick font and a little air. */
const MIN_TICK_SPACING = 18;

/**
 * Our own y ticks (the log axis: ascending, the first at 0 and the last at the top, `max`), thinned so no two labels
 * on an axis `height` pixels tall are nearer than `MIN_TICK_SPACING`. It keeps the top and every `step`th tick below
 * it, with the smallest `step` that fits, so a crowded axis shows every other (or every third...) power of ten rather
 * than whichever Chart.js's auto-skip happens to drop. 0 always stays; a kept tick too near it is dropped.
 */
export function thinTicks<T extends { value: number }>(ticks: T[], height: number): T[] {
    const max = ticks[ticks.length - 1]?.value ?? 0;
    if (ticks.length < 3 || !(height > 0) || !(max > 0)) return ticks;
    const pixel = (tick: T) => (tick.value / max) * height;
    const last = ticks.length - 1;
    for (let step = 1; step <= last; step++) {
        const kept = ticks.filter((_, i) => i > 0 && (last - i) % step === 0);
        const fits = kept.every((tick, i) => i === 0 || pixel(tick) - pixel(kept[i - 1]) >= MIN_TICK_SPACING);
        if (!fits) continue;
        while (kept.length > 1 && pixel(kept[0]) - pixel(ticks[0]) < MIN_TICK_SPACING) kept.shift();
        return [ticks[0], ...kept];
    }
    return [ticks[0], ticks[last]];
}

/** Room around the plot, in pixels. A model's `roomAbove` is added at the top (the today label). */
const PADDING = { top: 8, right: 12, bottom: 0, left: 0 };

const LINE_WIDTH = 2.25;
const COMPARE_LINE_WIDTH = 1.75;
const POINT_HOVER_RADIUS = 4;

/** Above this many points per series, dots would crowd the line, so only the hovered point shows. */
const MAX_POINTS_WITH_DOTS = 45;

/**
 * The one place that talks to Chart.js. The element hands it a `UauiChartModel` and listens for hover;
 * the tooltip itself is HTML, drawn by the element. Create it once per canvas and call `update` for
 * every change, including loading toggles: it is only destroyed when the element disconnects.
 * `UauiChartController` owns it. A chart's own drawing (the time-series chart's markers and today line) comes in as
 * per-chart plugins, never registered globally.
 */
export class UauiChartRenderer {
    #chart?: Chart;
    #family?: "line" | "bar";
    #colors?: UauiChartDrawColors;
    #lastHover?: UauiChartHover;
    #canvas: HTMLCanvasElement;
    #host: HTMLElement;
    #onHover: (hover: UauiChartHover | undefined) => void;
    #onThemeChange: () => void;
    #stopThemeWatch?: () => void;
    #inThemeChange = false;
    #plugins: () => Plugin[];

    /**
     * `host` is the element whose palette the chart draws in. `onThemeChange` is called when the theme's chart colours
     * change (`uauiWatchTheme`, as a product's chart uses), for the owner to resolve its colours again and call
     * `update`. `plugins` makes the chart's own plugins, drawn after the hover line, for each Chart.js chart created
     * (a new one per change between the line and bar kinds); the owner keeps their state and changes it before `update`.
     */
    constructor(
        canvas: HTMLCanvasElement,
        host: HTMLElement,
        onHover: (hover: UauiChartHover | undefined) => void,
        onThemeChange: () => void = () => {},
        plugins: () => Plugin[] = () => [],
    ) {
        this.#canvas = canvas;
        this.#host = host;
        this.#onHover = onHover;
        this.#onThemeChange = onThemeChange;
        this.#plugins = plugins;
    }

    /** Draws again without relayout, after a plugin's state changed. Cheap. */
    draw(): void {
        this.#chart?.draw();
    }

    /** Chart.js can't change a chart's type, so moving between the line and bar kinds builds a new chart. */
    #create(family: "line" | "bar", colors: UauiChartDrawColors): Chart {
        const hoverLine: Plugin = {
            id: "uauiHoverLine",
            beforeDatasetsDraw: (chart) => {
                const active = chart.getActiveElements()[0]?.element;
                if (!active || !this.#colors) return;
                const { ctx, chartArea } = chart;
                ctx.save();
                if (family === "bar") {
                    // Bars are wide, so the hovered x value is shown as a faint band behind them.
                    const width = chartArea.width / Math.max(chart.data.labels?.length ?? 1, 1);
                    ctx.globalAlpha = 0.25;
                    ctx.fillStyle = this.#colors.hoverLine;
                    ctx.fillRect(active.x - width / 2, chartArea.top, width, chartArea.bottom - chartArea.top);
                } else {
                    ctx.strokeStyle = this.#colors.hoverLine;
                    ctx.lineWidth = 1;
                    ctx.setLineDash([3, 3]);
                    ctx.beginPath();
                    ctx.moveTo(active.x, chartArea.top);
                    ctx.lineTo(active.x, chartArea.bottom);
                    ctx.stroke();
                }
                ctx.restore();
            },
        };

        // The package look a product's chart gets too (`uauiChartOptions`): only the parts our chart uses, as its plugins
        // are its own (see `onlyOwnPlugins`). The scales are styled from it in `update`.
        const { responsive, maintainAspectRatio, animation, events } = uauiChartOptions(this.#host, family, colors);
        const plugins = [hoverLine, ...this.#plugins()];
        const config: ChartConfiguration = {
            type: family,
            data: { labels: [], datasets: [] },
            plugins,
            // Everything we rely on is set here rather than left to `Chart.defaults`, which products share.
            options: {
                responsive,
                maintainAspectRatio,
                animation,
                indexAxis: "x",
                // Chart.js types `parsing` as keys or `false`; `true` (its default) parses our plain number arrays.
                parsing: true as unknown as false,
                normalized: false,
                events,
                layout: { padding: { ...PADDING } },
                interaction: { mode: "index", intersect: false, axis: "x" },
                hover: { mode: "index", intersect: false, axis: "x" },
                scales: { x: {}, y: { min: 0 } },
                plugins: {
                    filler: { propagate: true, drawTime: "beforeDatasetDraw" },
                    tooltip: {
                        enabled: false,
                        mode: "index",
                        intersect: false,
                        axis: "x",
                        position: "average",
                        filter: () => true,
                        external: ({ tooltip }) => {
                            const points = tooltip.opacity === 0 ? [] : tooltip.dataPoints;
                            if (!points?.length) {
                                this.#lastHover = undefined;
                                this.#onHover(undefined);
                                return;
                            }
                            const hover = {
                                index: points[0].dataIndex,
                                x: tooltip.caretX,
                                y: Math.min(...points.map((p) => (p.element as PointElement).y)),
                            };
                            // Raised on every mouse move, but only a change of x value or height matters.
                            const last = this.#lastHover;
                            if (last && last.index === hover.index && last.y === hover.y) return;
                            this.#lastHover = hover;
                            this.#onHover(hover);
                        },
                    },
                },
            },
        };
        config.options!.plugins = onlyOwnPlugins(config.options!.plugins!, new Set([...OWN_PLUGINS, ...plugins.map((plugin) => plugin.id)]));
        const chart = new Chart(this.#canvas, config);
        this.#stopThemeWatch?.();
        this.#stopThemeWatch = uauiWatchTheme(this.#host, chart, () => {
            // The watch calls `chart.update()` right after this, so an `update` from the owner skips its own.
            this.#inThemeChange = true;
            try {
                this.#onThemeChange();
            } finally {
                this.#inThemeChange = false;
            }
        });
        return chart;
    }

    update(model: UauiChartModel): void {
        this.#colors = model.colors;
        // A chart with any bars is a bar chart (its x-axis leaves room for them); its lines are line datasets in it.
        const barKind = model.kind === "bar" || model.kind === "stacked-bar";
        const family = (model.datasets.length ? model.datasets.some((set) => set.kind === "bar") : barKind) ? "bar" : "line";
        if (!this.#chart || this.#family !== family) {
            this.#destroyChart();
            this.#chart = this.#create(family, model.colors);
            this.#family = family;
            this.#lastHover = undefined;
            this.#onHover(undefined);
        }
        const chart = this.#chart;
        chart.data.labels = model.labels;
        chart.data.datasets = this.#datasets(model, family === "bar" && model.datasets.some((set) => set.kind === "line"));

        // Only bars stack: a `stacked-bar` chart whose series are all lines draws them unstacked. Lines also carry a
        // stack key of their own, so they never stack with bars or with each other. The share view stacks everything.
        const stacked = (model.kind === "stacked-bar" && family === "bar") || !!model.share;
        // Room above the plot for what the chart's own plugins draw there (the today label).
        chart.options.layout = { padding: { ...PADDING, top: PADDING.top + (model.roomAbove ?? 0) } };
        const scales = chart.options.scales!;
        // The package's axis look (`uauiChartOptions`, as a product's chart gets it): our font, colours and Chart.js's
        // own values for what we don't style, all set per chart so a product's `Chart.defaults.scale` can't move them.
        const look = uauiChartOptions(this.#host, family, model.colors).scales as { x: CartesianScaleOptions; y: CartesianScaleOptions };
        scales["x"] = { ...look.x, stacked };
        const yTicks = model.yTicks;
        const labelOf = new Map(yTicks?.map((tick) => [tick.value, tick.label]));
        scales["y"] = {
            ...look.y,
            stacked,
            min: 0,
            max: model.yMax,
            ticks: {
                ...look.y.ticks,
                stepSize: model.yStep,
                // Our ticks are thinned below, by a rule we choose, so Chart.js mustn't drop any of them itself.
                ...(yTicks ? { autoSkip: false } : {}),
                callback: yTicks ? (value: unknown) => labelOf.get(Number(value)) ?? "" : (value: unknown) => model.formatTick(Number(value)),
            },
            // Set per chart, so only this chart's ticks change. Chart.js calls it before it makes the tick labels, once
            // it knows the axis height (`maxHeight`).
            afterBuildTicks: yTicks
                ? (axis: { ticks: { value: number }[]; maxHeight: number }) => {
                      axis.ticks = thinTicks(yTicks, axis.maxHeight).map((tick) => ({ value: tick.value }));
                  }
                : undefined,
        } as typeof look.y;
        if (!this.#inThemeChange) chart.update();
    }

    /**
     * Every series in its own place (each keeps its dataset index, by which hover and the tooltip find it), as a line or
     * bars, then the lines' compare lines, then the compare bar. `mixed`: lines over bars, so they are drawn last.
     */
    #datasets(model: UauiChartModel, mixed: boolean) {
        const compared = model.datasets.flatMap((set, i) => (set.kind === "line" && set.compare ? [i] : []));
        const barCount = model.datasets.filter((set) => set.kind === "bar").length;
        const current = model.datasets.map((set, i) =>
            set.kind === "bar" ? this.#barDataset(model, i) : this.#lineDataset(model, i, compared.indexOf(i), mixed),
        );
        const compareLines = compared.map((i) => this.#compareLineDataset(model, i, mixed));
        const compareBar = barCount && model.compareTotal ? [this.#compareBarDataset(model, barCount)] : [];
        return [...current, ...compareLines, ...compareBar];
    }

    // The datasets are built as plain objects: Chart.js types the dataset by chart type, and the two kinds differ.
    // `compareIndex` is this line's place among the compare lines, which come after every series (-1 for none).
    #lineDataset(model: UauiChartModel, i: number, compareIndex: number, mixed: boolean) {
        if (model.share) return this.#shareBandDataset(model, i);
        const { colors } = model;
        const set = model.datasets[i];
        const gap = model.lowerIsBetter ? { above: colors.gapBad, below: colors.gapGood } : { above: colors.gapGood, below: colors.gapBad };
        const showDots = model.labels.length <= MAX_POINTS_WITH_DOTS;
        const color = colors.series[i];
        const pointRadius = showDots && compareIndex < 0 ? 2 : 0;
        return {
            type: "line" as const,
            // In a chart with bars: drawn over them, and never stacked with them or another line.
            stack: `line-${i}`,
            ...(mixed ? { order: -1 } : {}),
            label: set.label,
            data: set.values,
            borderColor: color.line,
            backgroundColor: color.fill,
            borderWidth: LINE_WIDTH,
            clip: lineClip(LINE_WIDTH, pointRadius, POINT_HOVER_RADIUS),
            borderJoinStyle: "round" as const,
            borderCapStyle: "butt" as const,
            cubicInterpolationMode: "monotone" as const,
            tension: 0,
            stepped: false,
            showLine: true,
            spanGaps: true,
            fill:
                compareIndex >= 0
                    ? { target: model.datasets.length + compareIndex, ...gap }
                    : model.kind === "area"
                      ? ("origin" as const)
                      : false,
            pointRadius,
            pointStyle: "circle" as const,
            pointBackgroundColor: color.line,
            pointBorderColor: color.line,
            pointHoverRadius: POINT_HOVER_RADIUS,
            pointHoverBackgroundColor: colors.surface,
            pointHoverBorderColor: color.line,
            pointHoverBorderWidth: 2,
        };
    }

    /**
     * The share view's area: one band per series, stacked on the bands before it and filled down to the one below (the
     * first to the axis), in the bar colour with a surface hairline on top, as stacked bar segments are told apart.
     */
    #shareBandDataset(model: UauiChartModel, i: number) {
        const { colors } = model;
        const color = colors.series[i];
        return {
            type: "line" as const,
            stack: "share",
            label: model.datasets[i].label,
            data: model.datasets[i].values,
            borderColor: colors.surface,
            backgroundColor: color.bar,
            borderWidth: 1,
            clip: lineClip(1, 0, POINT_HOVER_RADIUS),
            borderJoinStyle: "round" as const,
            borderCapStyle: "butt" as const,
            cubicInterpolationMode: "default" as const,
            tension: 0,
            stepped: false,
            showLine: true,
            // A date with no total has no share: leave it empty rather than bridging it.
            spanGaps: false,
            fill: i === 0 ? ("origin" as const) : ("-1" as const),
            pointRadius: 0,
            pointStyle: "circle" as const,
            pointHoverRadius: POINT_HOVER_RADIUS,
            pointHoverBackgroundColor: colors.surface,
            pointHoverBorderColor: color.line,
            pointHoverBorderWidth: 2,
        };
    }

    #compareLineDataset(model: UauiChartModel, i: number, mixed: boolean) {
        const { colors } = model;
        return {
            type: "line" as const,
            stack: `compare-line-${i}`,
            ...(mixed ? { order: -1 } : {}),
            label: model.datasets[i].label,
            data: model.datasets[i].compare!,
            borderColor: colors.compare,
            backgroundColor: colors.compare,
            borderWidth: COMPARE_LINE_WIDTH,
            clip: lineClip(COMPARE_LINE_WIDTH, 0, POINT_HOVER_RADIUS),
            borderDash: [5, 4],
            borderJoinStyle: "round" as const,
            borderCapStyle: "butt" as const,
            cubicInterpolationMode: "monotone" as const,
            tension: 0,
            stepped: false,
            showLine: true,
            spanGaps: true,
            fill: false,
            pointRadius: 0,
            pointStyle: "circle" as const,
            pointHoverRadius: POINT_HOVER_RADIUS,
            pointHoverBackgroundColor: colors.surface,
            pointHoverBorderColor: colors.compare,
            pointHoverBorderWidth: 2,
        };
    }

    /** One series' bars, grouped beside the other bar series, or stacked on them in `stacked-bar`. */
    #barDataset(model: UauiChartModel, i: number) {
        const { colors } = model;
        const stacked = model.kind === "stacked-bar";
        return {
            type: "bar" as const,
            label: model.datasets[i].label,
            data: model.datasets[i].values,
            order: 0,
            stack: stacked ? "current" : undefined,
            grouped: true,
            backgroundColor: colors.series[i].bar,
            // Stacked segments are told apart by a surface-coloured hairline as well as by colour.
            borderColor: colors.surface,
            borderWidth: stacked ? { top: 1, bottom: 1, left: 0, right: 0 } : 0,
            borderSkipped: false as const,
            borderRadius: 0,
            clip: 0, // Chart.js's own clip for bars: none past the chart area
            categoryPercentage: 0.8,
            barPercentage: stacked ? 0.55 : 0.9,
            maxBarThickness: MAX_BAR_WIDTH,
        };
    }

    /**
     * The compare total: one more bar per x value, not grouped with the others and drawn first (a higher `order` is drawn
     * earlier), so it sits behind them, wider than the group of `barCount` bars.
     */
    #compareBarDataset(model: UauiChartModel, barCount: number) {
        const groupWidth = model.kind === "stacked-bar" ? MAX_BAR_WIDTH : MAX_BAR_WIDTH * Math.max(barCount, 1);
        return {
            type: "bar" as const,
            label: "",
            data: model.compareTotal!,
            order: 1,
            stack: "compare",
            grouped: false,
            backgroundColor: model.colors.compareBar,
            borderWidth: 0,
            borderRadius: 0,
            clip: 0,
            categoryPercentage: 0.9,
            barPercentage: 1,
            maxBarThickness: groupWidth + COMPARE_BAR_EXTRA_WIDTH,
        };
    }

    /** Redraws with the current data, e.g. once a web font has loaded. */
    redraw(): void {
        this.#chart?.update();
    }

    #destroyChart(): void {
        this.#stopThemeWatch?.();
        this.#stopThemeWatch = undefined;
        this.#chart?.destroy();
        this.#chart = undefined;
    }

    destroy(): void {
        this.#destroyChart();
    }
}
