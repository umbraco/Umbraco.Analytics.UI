import { Chart, type ChartConfiguration, type PointElement, type Plugin } from "chart.js";
import type { UaxChartColors } from "./chart-colors.js";
import "./register.js";

/** What the renderer draws. Our own shape: Chart.js types stay inside `src/chart/internal`. */
export interface UaxChartModel {
    kind: "line" | "area";
    labels: string[];
    datasets: { label: string; values: (number | null)[] }[];
    /** The y-axis runs from 0 to `yMax` in steps of `yStep`. */
    yMax: number;
    yStep: number;
    formatTick: (value: number) => string;
    colors: UaxChartColors;
}

/** The date the pointer is on, and where to anchor a tooltip (canvas pixels). */
export interface UaxChartHover {
    index: number;
    x: number;
    y: number;
}

/** Above this many points per series, dots would crowd the line, so only the hovered point shows. */
const MAX_POINTS_WITH_DOTS = 45;

/**
 * The one place that talks to Chart.js. The element hands it a `UaxChartModel` and listens for hover;
 * the tooltip itself is HTML, drawn by the element. Create it once per canvas and call `update` for
 * every change, including loading toggles: it is only destroyed when the element disconnects.
 */
export class UaxChartRenderer {
    #chart: Chart<"line">;
    #colors?: UaxChartColors;
    #lastHover?: UaxChartHover;

    constructor(canvas: HTMLCanvasElement, onHover: (hover: UaxChartHover | undefined) => void) {
        const hoverLine: Plugin = {
            id: "uaxHoverLine",
            beforeDatasetsDraw: (chart) => {
                const active = chart.getActiveElements()[0]?.element;
                if (!active || !this.#colors) return;
                const { ctx, chartArea } = chart;
                ctx.save();
                ctx.strokeStyle = this.#colors.hoverLine;
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(active.x, chartArea.top);
                ctx.lineTo(active.x, chartArea.bottom);
                ctx.stroke();
                ctx.restore();
            },
        };

        const config: ChartConfiguration<"line"> = {
            type: "line",
            data: { labels: [], datasets: [] },
            plugins: [hoverLine],
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
                                onHover(undefined);
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
                            onHover(hover);
                        },
                    },
                },
            },
        };
        this.#chart = new Chart(canvas, config);
    }

    update(model: UaxChartModel): void {
        const { colors } = model;
        this.#colors = colors;
        const chart = this.#chart;
        const showDots = model.labels.length <= MAX_POINTS_WITH_DOTS;

        chart.data.labels = model.labels;
        chart.data.datasets = model.datasets.map((set, i) => {
            const color = colors.series[i];
            return {
                label: set.label,
                data: set.values,
                borderColor: color.line,
                backgroundColor: color.fill,
                borderWidth: 2.25,
                borderJoinStyle: "round" as const,
                cubicInterpolationMode: "monotone" as const,
                spanGaps: true,
                fill: model.kind === "area" ? "origin" : false,
                pointRadius: showDots ? 2 : 0,
                pointBackgroundColor: color.line,
                pointBorderColor: color.line,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: colors.surface,
                pointHoverBorderColor: color.line,
                pointHoverBorderWidth: 2,
            };
        });

        const font = { family: colors.fontFamily, size: 11 };
        const options = chart.options;
        const scales = options.scales!;
        scales["x"] = {
            grid: { display: false },
            border: { color: colors.grid },
            ticks: { color: colors.tick, font, maxRotation: 45, autoSkip: true },
        };
        scales["y"] = {
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

    /** Redraws with the current data, e.g. once a web font has loaded. */
    redraw(): void {
        this.#chart.update();
    }

    destroy(): void {
        this.#chart.destroy();
    }
}
