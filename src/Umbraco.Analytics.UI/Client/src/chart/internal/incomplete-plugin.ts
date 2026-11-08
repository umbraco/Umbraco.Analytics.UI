import type { Plugin } from "#platform/chart";
import type { UauiChartDrawColors } from "./chart-colors.js";

/** What the plugin draws. The element owns it and changes it between draws. */
export interface UauiIncompleteState {
    /** The index of the first incomplete date: it and every date after are shaded. None draws nothing. */
    from?: number;
    colors?: UauiChartDrawColors;
}

/** One tile of the hatch, in CSS pixels. */
const TILE = 8;

/** A diagonal hatch tile in `color`, drawn at `ratio` device pixels per CSS pixel so it stays sharp. */
function hatchPattern(ctx: CanvasRenderingContext2D, color: string, ratio: number): CanvasPattern | null {
    const tile = document.createElement("canvas");
    tile.width = tile.height = Math.round(TILE * ratio);
    const g = tile.getContext("2d");
    if (!g) return null;
    g.scale(ratio, ratio);
    g.strokeStyle = color;
    g.lineWidth = 2;
    g.beginPath();
    // The diagonal, plus its two corners so the stripes join across tiles.
    g.moveTo(0, TILE);
    g.lineTo(TILE, 0);
    g.moveTo(-2, 2);
    g.lineTo(2, -2);
    g.moveTo(TILE - 2, TILE + 2);
    g.lineTo(TILE + 2, TILE - 2);
    g.stroke();
    const pattern = ctx.createPattern(tile, "repeat");
    pattern?.setTransform(new DOMMatrix().scale(1 / ratio));
    return pattern;
}

/**
 * Shades the incomplete part of the chart with a light diagonal hatch, behind the series: for lines from the point
 * before the first incomplete date to the last, for bars from the first incomplete slot to the plot's right edge. It
 * draws no label and is not interactive: the tooltip and the hidden table say which dates are incomplete.
 */
export function createIncompletePlugin(state: UauiIncompleteState): Plugin {
    let tile: { color: string; ratio: number; pattern: CanvasPattern | null } | undefined;
    return {
        id: "uauiIncomplete",
        // Before the chart's own drawing, so the hover line or band, the now line and the series all sit above it.
        beforeDraw: (chart) => {
            const { from, colors } = state;
            const count = chart.data.labels?.length ?? 0;
            if (from === undefined || !colors || from >= count) return;
            const { ctx, chartArea } = chart;
            const x = chart.scales["x"];
            let left: number;
            let right: number;
            if ((chart.config as { type?: string }).type === "bar") {
                // Bars sit in slots of equal width across the plot.
                left = Math.max(chartArea.left, x.getPixelForValue(from) - chartArea.width / count / 2);
                right = chartArea.right;
            } else {
                left = from === 0 ? chartArea.left : x.getPixelForValue(from - 1);
                right = x.getPixelForValue(count - 1);
            }
            if (!Number.isFinite(left) || !Number.isFinite(right) || right <= left) return;

            const ratio = chart.currentDevicePixelRatio || 1;
            if (!tile || tile.color !== colors.incompleteHatch || tile.ratio !== ratio) {
                tile = { color: colors.incompleteHatch, ratio, pattern: hatchPattern(ctx, colors.incompleteHatch, ratio) };
            }
            if (!tile.pattern) return;
            ctx.save();
            ctx.beginPath();
            ctx.rect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
            ctx.clip();
            ctx.fillStyle = tile.pattern;
            ctx.fillRect(left, chartArea.top, right - left, chartArea.bottom - chartArea.top);
            ctx.restore();
        },
    };
}
