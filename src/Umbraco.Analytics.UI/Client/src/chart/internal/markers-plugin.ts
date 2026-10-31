import type { Chart, Plugin } from "chart.js";
import type { UauiChartColors } from "./chart-colors.js";

/** One dot to draw: at the `index`th date of the chart, standing for `count` markers. */
export interface UauiMarkerPin {
    index: number;
    count: number;
}

/** Where a dot was drawn, in CSS pixels from the canvas's top left. The element puts a button there. */
export interface UauiMarkerPlacement {
    index: number;
    x: number;
    y: number;
}

/** What the plugin draws and where it reports to. The renderer owns it and changes it between draws. */
export interface UauiMarkersState {
    pins: UauiMarkerPin[];
    /** The date index of the dot that is hovered or focused. It is drawn larger and stronger. */
    active?: number;
    colors?: UauiChartColors;
    onLayout: (placements: UauiMarkerPlacement[]) => void;
}

const DOT_RADIUS = 5;
const GROUP_DOT_RADIUS = 8;
const RING_WIDTH = 1.5;

/**
 * Draws each marker as a dashed vertical line behind the series and a dot on the x-axis in front of them, and
 * reports where the dots landed after every layout so HTML buttons can sit over them (a canvas has no focus
 * targets). Several markers on one date are one dot with their count in it. Like Engage's annotations, a marker is
 * placed at its date's bucket, but drawn here rather than through chartjs-plugin-annotation.
 */
export function createMarkersPlugin(state: UauiMarkersState): Plugin {
    let reported = "[]";
    const placementsOf = (chart: Chart): UauiMarkerPlacement[] =>
        state.pins
            .map((pin) => ({ index: pin.index, x: chart.scales["x"].getPixelForValue(pin.index), y: chart.chartArea.bottom }))
            .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

    return {
        id: "uauiMarkers",
        afterLayout: (chart) => {
            const placements = placementsOf(chart);
            const key = JSON.stringify(placements);
            if (key === reported) return;
            reported = key;
            state.onLayout(placements);
        },
        beforeDatasetsDraw: (chart) => {
            const { colors } = state;
            if (!colors || !state.pins.length) return;
            const { ctx, chartArea } = chart;
            ctx.save();
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 4]);
            // The active line last, so it sits over its neighbours.
            for (const placement of orderedForDraw(placementsOf(chart), state.active)) {
                ctx.strokeStyle = placement.index === state.active ? colors.markerLineActive : colors.markerLine;
                ctx.beginPath();
                ctx.moveTo(placement.x, chartArea.top);
                ctx.lineTo(placement.x, chartArea.bottom);
                ctx.stroke();
            }
            ctx.restore();
        },
        afterDatasetsDraw: (chart) => {
            const { colors } = state;
            if (!colors || !state.pins.length) return;
            const { ctx } = chart;
            const counts = new Map(state.pins.map((pin) => [pin.index, pin.count]));
            ctx.save();
            for (const placement of orderedForDraw(placementsOf(chart), state.active)) {
                const count = counts.get(placement.index) ?? 1;
                const active = placement.index === state.active;
                const radius = (count > 1 ? GROUP_DOT_RADIUS : DOT_RADIUS) + (active ? 1 : 0);
                ctx.beginPath();
                ctx.arc(placement.x, placement.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = active ? colors.markerHover : colors.marker;
                ctx.fill();
                // Ringed in the surface colour, so the dot reads where it lands on a series or a bar.
                ctx.lineWidth = RING_WIDTH;
                ctx.strokeStyle = colors.surface;
                ctx.stroke();
                if (count > 1) {
                    ctx.fillStyle = colors.surface;
                    ctx.font = `700 10px ${colors.fontFamily}`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(count > 9 ? "9+" : String(count), placement.x, placement.y + 0.5);
                }
            }
            ctx.restore();
        },
    };
}

/** The active placement moves to the end, so it is drawn on top. */
function orderedForDraw(placements: UauiMarkerPlacement[], active?: number): UauiMarkerPlacement[] {
    return [...placements.filter((p) => p.index !== active), ...placements.filter((p) => p.index === active)];
}
