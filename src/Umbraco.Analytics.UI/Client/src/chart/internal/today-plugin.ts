import type { Plugin } from "@umbraco/analytics-ui/external/chart.js";
import type { UauiChartDrawColors } from "./chart-colors.js";

/** Where today is on the chart: the index of the date (bucket) that contains it, and the word drawn over its line. */
export interface UauiTodayPin {
    index: number;
    label: string;
}

/** What the plugin draws. The renderer owns it and changes it between draws. */
export interface UauiTodayState {
    pin?: UauiTodayPin;
    colors?: UauiChartDrawColors;
}

/** The room above the plot for the label, in pixels, added to the chart's top padding while there is a today line. */
export const TODAY_LABEL_ROOM = 16;

/**
 * Draws a thin solid line up the chart at today's date, behind the series, with its label ("Today") above the plot.
 * Solid and unlabelled by a dot, so it can't be taken for a marker (dashed, with a dot that is a button). It is not
 * interactive: the hidden table and the tooltip name today's date instead.
 */
export function createTodayPlugin(state: UauiTodayState): Plugin {
    return {
        id: "uauiToday",
        beforeDatasetsDraw: (chart) => {
            const { pin, colors } = state;
            if (!pin || !colors) return;
            const x = chart.scales["x"].getPixelForValue(pin.index);
            if (!Number.isFinite(x)) return;
            const { ctx, chartArea } = chart;
            ctx.save();
            ctx.strokeStyle = colors.text;
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
            ctx.beginPath();
            // Half-pixel aligned, so a 1px line stays crisp.
            const crisp = Math.round(x) + 0.5;
            ctx.moveTo(crisp, chartArea.top);
            ctx.lineTo(crisp, chartArea.bottom);
            ctx.stroke();

            ctx.fillStyle = colors.text;
            ctx.font = `700 11px ${colors.fontFamily}`;
            ctx.textBaseline = "bottom";
            ctx.textAlign = "center";
            const half = ctx.measureText(pin.label).width / 2;
            // Kept inside the canvas when today is near either end.
            const labelX = Math.min(Math.max(x, half + 1), chart.width - half - 1);
            ctx.fillText(pin.label, labelX, chartArea.top - 3);
            ctx.restore();
        },
    };
}
