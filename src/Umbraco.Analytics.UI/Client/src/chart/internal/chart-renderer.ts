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
import type { UauiChartKind } from "../types.js";
import type { UauiChartDrawColors } from "./chart-colors.js";
import { createMarkersPlugin, type UauiMarkerPin, type UauiMarkerPlacement, type UauiMarkersState } from "./markers-plugin.js";
import "./register.js";

/** What the renderer draws. Our own shape: Chart.js types stay inside `src/chart/internal`. */
export interface UauiChartModel {
    kind: UauiChartKind;
    labels: string[];
    /** For the line kinds, `compare` is drawn as a dashed line, with the gap to `values` shaded. */
    datasets: { label: string; values: (number | null)[]; compare?: (number | null)[] }[];
    /** For the bar kinds, one compare bar per date, drawn behind the current bars. */
    compareTotal?: (number | null)[];
    /** The y-axis runs from 0 to `yMax` in steps of `yStep`. */
    yMax: number;
    yStep: number;
    formatTick: (value: number) => string;
    colors: UauiChartDrawColors;
    /** Line kinds: a series below its compare line is doing better, so the gap shading flips. */
    lowerIsBetter?: boolean;
    /** One dot on the x-axis per entry. */
    markers?: UauiMarkerPin[];
}

/** The date the pointer is on, and where to anchor a tooltip (canvas pixels). */
export interface UauiChartHover {
    index: number;
    x: number;
    y: number;
}

/** Widest a bar gets on a chart with few points, in pixels. The compare bar is a little wider than the current bars. */
const MAX_BAR_WIDTH = 28;
const COMPARE_BAR_EXTRA_WIDTH = 12;

const isBarKind = (kind: UauiChartKind) => kind === "bar" || kind === "stacked-bar";

/**
 * Chart.js is shared with the products (`@umbraco/analytics-ui/external/chart.js`), so its registry and `Chart.defaults`
 * are too. Our chart sets everything it relies on per chart, so a product's global registrations and defaults don't
 * change it: every registered plugin but these is off for our chart.
 */
const OWN_PLUGINS = new Set(["filler", "tooltip", "uauiHoverLine", "uauiMarkers"]);

/** Whether `id` is a plugin in the shared registry. Chart.js doesn't type `items`, so read it with care. */
const isRegisteredPlugin = (id: string): boolean =>
    Object.prototype.hasOwnProperty.call((registry.plugins as unknown as { items?: object }).items ?? {}, id);

/**
 * Wraps a chart's `options.plugins` so it answers `false` (off) for every registered plugin we don't use. Chart.js asks
 * each time it rebuilds a chart's plugin list (every update and resize), so a plugin a product registers globally,
 * even after our chart was drawn, never runs on our chart.
 */
const onlyOwnPlugins = <T extends object>(plugins: T): T =>
    new Proxy(plugins, {
        get: (target, key, receiver) =>
            typeof key === "string" && !OWN_PLUGINS.has(key) && !Object.prototype.hasOwnProperty.call(target, key) && isRegisteredPlugin(key)
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

const LINE_WIDTH = 2.25;
const COMPARE_LINE_WIDTH = 1.75;
const POINT_HOVER_RADIUS = 4;

/** Above this many points per series, dots would crowd the line, so only the hovered point shows. */
const MAX_POINTS_WITH_DOTS = 45;

/**
 * The one place that talks to Chart.js. The element hands it a `UauiChartModel` and listens for hover;
 * the tooltip itself is HTML, drawn by the element. Create it once per canvas and call `update` for
 * every change, including loading toggles: it is only destroyed when the element disconnects.
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
    #markers: UauiMarkersState;

    /**
     * `host` is the element whose palette the chart draws in. `onMarkerLayout` is told where the marker dots are drawn,
     * after every layout in which they moved. `onThemeChange` is called when the theme's chart colours change
     * (`uauiWatchTheme`, as a product's chart uses), for the owner to resolve its colours again and call `update`.
     */
    constructor(
        canvas: HTMLCanvasElement,
        host: HTMLElement,
        onHover: (hover: UauiChartHover | undefined) => void,
        onMarkerLayout: (placements: UauiMarkerPlacement[]) => void = () => {},
        onThemeChange: () => void = () => {},
    ) {
        this.#canvas = canvas;
        this.#host = host;
        this.#onHover = onHover;
        this.#onThemeChange = onThemeChange;
        this.#markers = { pins: [], onLayout: onMarkerLayout };
    }

    /** Draws the dot at the `index`th date larger and stronger, or none. Cheap: redraws without relayout. */
    setActiveMarker(index: number | undefined): void {
        if (this.#markers.active === index) return;
        this.#markers.active = index;
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
                    // Bars are wide, so the hovered date is shown as a faint band behind them.
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
        const config: ChartConfiguration = {
            type: family,
            data: { labels: [], datasets: [] },
            plugins: [hoverLine, createMarkersPlugin(this.#markers)],
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
                layout: { padding: { top: 8, right: 12, bottom: 0, left: 0 } },
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
                            // Raised on every mouse move, but only a change of date or height matters.
                            const last = this.#lastHover;
                            if (last && last.index === hover.index && last.y === hover.y) return;
                            this.#lastHover = hover;
                            this.#onHover(hover);
                        },
                    },
                },
            },
        };
        config.options!.plugins = onlyOwnPlugins(config.options!.plugins!);
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
        this.#markers.colors = model.colors;
        this.#markers.pins = model.markers ?? [];
        const family = isBarKind(model.kind) ? "bar" : "line";
        if (!this.#chart || this.#family !== family) {
            this.#destroyChart();
            this.#chart = this.#create(family, model.colors);
            this.#family = family;
            this.#lastHover = undefined;
            this.#onHover(undefined);
        }
        const chart = this.#chart;
        chart.data.labels = model.labels;
        chart.data.datasets = family === "bar" ? this.#barDatasets(model) : this.#lineDatasets(model);

        const stacked = model.kind === "stacked-bar";
        const scales = chart.options.scales!;
        // The package's axis look (`uauiChartOptions`, as a product's chart gets it): our font, colours and Chart.js's
        // own values for what we don't style, all set per chart so a product's `Chart.defaults.scale` can't move them.
        const look = uauiChartOptions(this.#host, family, model.colors).scales as { x: CartesianScaleOptions; y: CartesianScaleOptions };
        scales["x"] = { ...look.x, stacked };
        scales["y"] = {
            ...look.y,
            stacked,
            min: 0,
            max: model.yMax,
            ticks: {
                ...look.y.ticks,
                stepSize: model.yStep,
                callback: (value) => model.formatTick(Number(value)),
            },
        } as typeof look.y;
        if (!this.#inThemeChange) chart.update();
    }

    // The datasets are built as plain objects: Chart.js types the dataset by chart type, and the two families differ.
    #lineDatasets(model: UauiChartModel) {
        const { colors } = model;
        const gap = model.lowerIsBetter ? { above: colors.gapBad, below: colors.gapGood } : { above: colors.gapGood, below: colors.gapBad };
        const showDots = model.labels.length <= MAX_POINTS_WITH_DOTS;
        // Compare lines come after every series, so each series keeps its dataset index.
        const compared = model.datasets.flatMap((set, i) => (set.compare ? [i] : []));
        const currentSets = model.datasets.map((set, i) => {
            const color = colors.series[i];
            const compareIndex = compared.indexOf(i);
            const pointRadius = showDots && compareIndex < 0 ? 2 : 0;
            return {
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
        });
        const compareSets = compared.map((i) => ({
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
        }));
        return [...currentSets, ...compareSets];
    }

    /**
     * Current bars first, so each series keeps its dataset index. The compare total is one more bar per date,
     * not grouped with the others and drawn first (a higher `order` is drawn earlier), so it sits behind them,
     * wider than the group.
     */
    #barDatasets(model: UauiChartModel) {
        const { colors } = model;
        const stacked = model.kind === "stacked-bar";
        const groupWidth = stacked ? MAX_BAR_WIDTH : MAX_BAR_WIDTH * Math.max(model.datasets.length, 1);
        const currentSets = model.datasets.map((set, i) => ({
            label: set.label,
            data: set.values,
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
        }));
        if (!model.compareTotal) return currentSets;
        return [
            ...currentSets,
            {
                label: "",
                data: model.compareTotal,
                order: 1,
                stack: "compare",
                grouped: false,
                backgroundColor: colors.compareBar,
                borderWidth: 0,
                borderRadius: 0,
                clip: 0,
                categoryPercentage: 0.9,
                barPercentage: 1,
                maxBarThickness: groupWidth + COMPARE_BAR_EXTRA_WIDTH,
            },
        ];
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
