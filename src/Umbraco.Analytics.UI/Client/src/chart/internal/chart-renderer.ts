import { Chart, type ChartConfiguration, type PointElement, type Plugin } from "chart.js";
import type { UauiChartKind } from "../types.js";
import type { UauiChartColors } from "./chart-colors.js";
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
    colors: UauiChartColors;
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
    #colors?: UauiChartColors;
    #lastHover?: UauiChartHover;
    #canvas: HTMLCanvasElement;
    #onHover: (hover: UauiChartHover | undefined) => void;
    #markers: UauiMarkersState;

    /** `onMarkerLayout` is told where the marker dots are drawn, after every layout in which they moved. */
    constructor(
        canvas: HTMLCanvasElement,
        onHover: (hover: UauiChartHover | undefined) => void,
        onMarkerLayout: (placements: UauiMarkerPlacement[]) => void = () => {},
    ) {
        this.#canvas = canvas;
        this.#onHover = onHover;
        this.#markers = { pins: [], onLayout: onMarkerLayout };
    }

    /** Draws the dot at the `index`th date larger and stronger, or none. Cheap: redraws without relayout. */
    setActiveMarker(index: number | undefined): void {
        if (this.#markers.active === index) return;
        this.#markers.active = index;
        this.#chart?.draw();
    }

    /** Chart.js can't change a chart's type, so moving between the line and bar kinds builds a new chart. */
    #create(family: "line" | "bar"): Chart {
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

        const config: ChartConfiguration = {
            type: family,
            data: { labels: [], datasets: [] },
            plugins: [hoverLine, createMarkersPlugin(this.#markers)],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                layout: { padding: { top: 8, right: 12 } },
                interaction: { mode: "index", intersect: false },
                scales: { x: {}, y: { min: 0 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: false,
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
        return new Chart(this.#canvas, config);
    }

    update(model: UauiChartModel): void {
        this.#colors = model.colors;
        this.#markers.colors = model.colors;
        this.#markers.pins = model.markers ?? [];
        const family = isBarKind(model.kind) ? "bar" : "line";
        if (!this.#chart || this.#family !== family) {
            this.#chart?.destroy();
            this.#chart = this.#create(family);
            this.#family = family;
            this.#lastHover = undefined;
            this.#onHover(undefined);
        }
        const chart = this.#chart;
        chart.data.labels = model.labels;
        chart.data.datasets = family === "bar" ? this.#barDatasets(model) : this.#lineDatasets(model);

        const { colors } = model;
        const font = { family: colors.fontFamily, size: 11 };
        const stacked = model.kind === "stacked-bar";
        const options = chart.options;
        const scales = options.scales!;
        scales["x"] = {
            stacked,
            grid: { display: false },
            border: { color: colors.grid },
            ticks: { color: colors.tick, font, maxRotation: 45, autoSkip: true },
        };
        scales["y"] = {
            stacked,
            min: 0,
            max: model.yMax,
            grid: { color: colors.grid, drawTicks: false },
            border: { display: false },
            ticks: {
                color: colors.tick,
                font,
                stepSize: model.yStep,
                padding: 8,
                callback: (value) => model.formatTick(Number(value)),
            },
        };
        chart.update();
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
            return {
                label: set.label,
                data: set.values,
                borderColor: color.line,
                backgroundColor: color.fill,
                borderWidth: 2.25,
                borderJoinStyle: "round" as const,
                cubicInterpolationMode: "monotone" as const,
                spanGaps: true,
                fill:
                    compareIndex >= 0
                        ? { target: model.datasets.length + compareIndex, ...gap }
                        : model.kind === "area"
                          ? ("origin" as const)
                          : false,
                pointRadius: showDots && compareIndex < 0 ? 2 : 0,
                pointBackgroundColor: color.line,
                pointBorderColor: color.line,
                pointHoverRadius: 4,
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
            borderWidth: 1.75,
            borderDash: [5, 4],
            borderJoinStyle: "round" as const,
            cubicInterpolationMode: "monotone" as const,
            spanGaps: true,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 4,
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
            backgroundColor: colors.series[i].bar,
            // Stacked segments are told apart by a surface-coloured hairline as well as by colour.
            borderColor: colors.surface,
            borderWidth: stacked ? { top: 1, bottom: 1, left: 0, right: 0 } : 0,
            borderSkipped: false as const,
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

    destroy(): void {
        this.#chart?.destroy();
        this.#chart = undefined;
    }
}
