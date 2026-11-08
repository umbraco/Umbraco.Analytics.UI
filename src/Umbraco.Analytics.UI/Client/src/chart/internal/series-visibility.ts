import type { ReactiveController, ReactiveControllerHost } from "#platform/lit";
import type { UauiChartData } from "./chart-values.js";

/**
 * Which series of one chart the editor has hidden from its legend, by series `id`. Per chart instance and visual only:
 * the chart's `series` is untouched, and a series that goes away and comes back with the same `id` stays hidden.
 * `hidden` is a new set after each toggle, so a chart can tell it changed by identity. Internal: not exported.
 */
export class UauiSeriesVisibility implements ReactiveController {
    readonly #host: ReactiveControllerHost;
    #hidden: ReadonlySet<string> = new Set();

    constructor(host: ReactiveControllerHost) {
        this.#host = host;
        host.addController(this);
    }

    hostConnected(): void {}

    get hidden(): ReadonlySet<string> {
        return this.#hidden;
    }

    /** Hides the series with this `id`, or shows it again, and updates the chart. */
    toggle(id: string): void {
        const next = new Set(this.#hidden);
        if (!next.delete(id)) next.add(id);
        this.#hidden = next;
        this.#host.requestUpdate();
    }
}

/** The series a chart draws, in `UauiChartData` shape, and where each sits in the chart's own `series`. */
export interface UauiVisibleData {
    data: UauiChartData;
    /** For each series in `data`, its index in the chart's `series`: its colour follows that, so hiding one never recolours another. */
    shown: number[];
}

/**
 * The data a chart draws: `full` (every series) when none is hidden. Otherwise `rebuild` makes it again with the hidden
 * series' compare series left out, so the compare total covers only what is drawn, and the hidden series are dropped from
 * it. The x values stay those of every series, so the axis doesn't move. `ids` are the chart's series ids, in order.
 */
export function visibleData(full: UauiChartData, ids: readonly string[], hidden: ReadonlySet<string>, rebuild: () => UauiChartData): UauiVisibleData {
    const shown = ids.flatMap((id, i) => (hidden.has(id) ? [] : [i]));
    if (shown.length === ids.length) return { data: full, shown };
    const rebuilt = rebuild();
    return { data: { ...rebuilt, series: shown.map((i) => rebuilt.series[i]) }, shown };
}
