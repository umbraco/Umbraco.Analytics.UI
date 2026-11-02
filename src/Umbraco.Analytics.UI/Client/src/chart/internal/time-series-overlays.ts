import type { Plugin } from "@umbraco/analytics-ui/external/chart.js";
import type { UauiChartDrawColors } from "./chart-colors.js";
import { createMarkersPlugin, type UauiMarkerPin, type UauiMarkerPlacement, type UauiMarkersState } from "./markers-plugin.js";
import { createTodayPlugin, type UauiTodayPin, type UauiTodayState } from "./today-plugin.js";

/**
 * What the time-series chart draws on the plot besides its series, which only a date x-axis has: the marker dots and
 * the today line. Keeps the plugins' state between draws; `plugins` is handed to the renderer, which makes a fresh
 * pair for each Chart.js chart it creates, as plugins are per chart (never registered globally).
 */
export class UauiTimeSeriesOverlays {
    #markers: UauiMarkersState;
    #today: UauiTodayState = {};

    /** `onMarkerLayout` is told where the marker dots are drawn, after every layout in which they moved. */
    constructor(onMarkerLayout: (placements: UauiMarkerPlacement[]) => void) {
        this.#markers = { pins: [], onLayout: onMarkerLayout };
    }

    /** The chart's plugins, in drawing order: the today line, then the markers. */
    readonly plugins = (): Plugin[] => [createTodayPlugin(this.#today), createMarkersPlugin(this.#markers)];

    /** What to draw at the next update of the chart. */
    set(colors: UauiChartDrawColors, markers: UauiMarkerPin[], today: UauiTodayPin | undefined): void {
        this.#markers.colors = colors;
        this.#markers.pins = markers;
        this.#today.colors = colors;
        this.#today.pin = today;
    }

    /** Draws the dot at the `index`th date larger and stronger, or none. Returns whether that changed, so the chart needs a redraw. */
    setActiveMarker(index: number | undefined): boolean {
        if (this.#markers.active === index) return false;
        this.#markers.active = index;
        return true;
    }
}
