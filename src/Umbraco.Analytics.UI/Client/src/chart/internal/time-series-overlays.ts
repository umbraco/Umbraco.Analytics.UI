import type { Plugin } from "@umbraco/analytics-ui/external/chart.js";
import type { UauiChartDrawColors } from "./chart-colors.js";
import { createIncompletePlugin, type UauiIncompleteState } from "./incomplete-plugin.js";
import { createMarkersPlugin, type UauiMarkerPin, type UauiMarkerPlacement, type UauiMarkersState } from "./markers-plugin.js";
import { createNowPlugin, type UauiNowPin, type UauiNowState } from "./now-plugin.js";

/**
 * What the time-series chart draws on the plot besides its series, which only a date x-axis has: the marker dots, the
 * now line and the hatch over the incomplete part. Keeps the plugins' state between draws; `plugins` is handed to the renderer, which makes a fresh
 * pair for each Chart.js chart it creates, as plugins are per chart (never registered globally).
 */
export class UauiTimeSeriesOverlays {
    #markers: UauiMarkersState;
    #now: UauiNowState = {};
    #incomplete: UauiIncompleteState = {};

    /** `onMarkerLayout` is told where the marker dots are drawn, after every layout in which they moved. */
    constructor(onMarkerLayout: (placements: UauiMarkerPlacement[]) => void) {
        this.#markers = { pins: [], onLayout: onMarkerLayout };
    }

    /** The chart's plugins, in drawing order: the incomplete hatch, the now line (so it stays on top), then the markers. */
    readonly plugins = (): Plugin[] => [createIncompletePlugin(this.#incomplete), createNowPlugin(this.#now), createMarkersPlugin(this.#markers)];

    /** What to draw at the next update of the chart. */
    set(colors: UauiChartDrawColors, markers: UauiMarkerPin[], now: UauiNowPin | undefined, incompleteFrom?: number): void {
        this.#markers.colors = colors;
        this.#markers.pins = markers;
        this.#now.colors = colors;
        this.#now.pin = now;
        this.#incomplete.colors = colors;
        this.#incomplete.from = incompleteFrom;
    }

    /** Draws the dot at the `index`th date larger and stronger, or none. Returns whether that changed, so the chart needs a redraw. */
    setActiveMarker(index: number | undefined): boolean {
        if (this.#markers.active === index) return false;
        this.#markers.active = index;
        return true;
    }
}
