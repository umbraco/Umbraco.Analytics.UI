// NFR — Performance targets (SPEC "Non-functional targets")
// Wall-clock specs: each reports the median of several runs and asserts it stays under the SPEC target.
// Chromium only (other engines time differently). CI runs these alone: `npm run test:perf`.
import { afterEach, describe, expect, it } from "vitest";
import { server } from "vitest/browser";
import { Chart } from "chart.js";
import "@umbraco-cms/backoffice/external/uui";
import "../../chart/time-series-chart.element.js";
import "../../table/data-table.element.js";
import { UAUI_TABLE_CELL } from "../../table/cells/cell-names.js";
import { settle, type UauiTestElement } from "../test/dom.js";
import type { UauiSeries } from "../../chart/types.js";

const RUNS = 7;
const timed = it.skipIf(server.browser !== "chromium");

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

/** Runs `measure` RUNS times and returns the median in milliseconds. `measure` mounts what it needs and returns how long the step took. */
async function medianOf(measure: () => Promise<number>) {
    const samples: number[] = [];
    for (let i = 0; i < RUNS; i++) samples.push(await measure());
    console.log(`[perf] samples (ms): ${samples.map((s) => s.toFixed(1)).join(", ")}`);
    return median(samples);
}

const mounted: HTMLElement[] = [];
afterEach(() => mounted.splice(0).forEach((el) => el.remove()));

function mount(tag: string, props: Record<string, unknown>, width = "900px"): UauiTestElement {
    const el = document.createElement(tag) as UauiTestElement;
    Object.assign(el, props);
    el.style.display = "block";
    el.style.width = width;
    mounted.push(el);
    return el;
}

/** `count` consecutive ISO dates starting 2024-01-01. 366 days covers a leap year, the longest range a picker offers. */
const isoDates = (count: number) =>
    Array.from({ length: count }, (_, i) => new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10));

const makeSeries = (seriesCount: number, pointCount: number): UauiSeries[] => {
    const dates = isoDates(pointCount);
    return Array.from({ length: seriesCount }, (_, s) => ({
        id: `s${s}`,
        label: `Series ${s + 1}`,
        color: ((s % 4) + 1) as 1 | 2 | 3 | 4,
        points: dates.map((date, i) => ({ date, value: Math.round(100 + 80 * Math.sin(i / (9 + s)) + s * 25) })),
    }));
};

describe("Feature: performance targets", () => {
    describe("Scenario: a chart of 6 series by 366 daily points", () => {
        const series = makeSeries(6, 366);

        timed("draws in under 100 ms (median of 7 mounts, cold JIT included)", async () => {
            const ms = await medianOf(async () => {
                const el = mount("uaui-time-series-chart", { kind: "line", series });
                const start = performance.now();
                document.body.append(el);
                await el.updateComplete;
                const elapsed = performance.now() - start;
                // Guard against timing a chart that drew nothing.
                const drawn = Chart.getChart(el.shadowRoot!.querySelector("canvas")!);
                expect(drawn?.data.datasets.length).toBe(6);
                expect(drawn?.data.labels?.length).toBe(366);
                return elapsed;
            });
            console.log(`[perf] chart 6x366 mount: median ${ms.toFixed(1)} ms`);
            expect(ms).toBeLessThan(100);
        });

        timed("redraws in under 100 ms when the series change (median of 7)", async () => {
            const el = mount("uaui-time-series-chart", { kind: "line", series });
            document.body.append(el);
            await el.updateComplete;
            expect(Chart.getChart(el.shadowRoot!.querySelector("canvas")!)?.data.datasets.length).toBe(6);
            const other = makeSeries(6, 366).map((s) => ({ ...s, points: s.points.map((p) => ({ ...p, value: p.value + 7 })) }));
            let flip = false;
            const ms = await medianOf(async () => {
                flip = !flip;
                const start = performance.now();
                el.series = flip ? other : series;
                await el.updateComplete;
                const elapsed = performance.now() - start;
                // The redraw must have swapped the data: the first point moved by 7.
                const first = Chart.getChart(el.shadowRoot!.querySelector("canvas")!)?.data.datasets[0].data[0];
                expect(first).toBe(flip ? other[0].points[0].value : series[0].points[0].value);
                return elapsed;
            });
            console.log(`[perf] chart 6x366 redraw: median ${ms.toFixed(1)} ms`);
            expect(ms).toBeLessThan(100);
        });
    });

    describe("Scenario: a client-mode table of 1,000 rows", () => {
        const columns = [
            { key: "name", label: "Name", sortable: true },
            { key: "views", label: "Views", elementName: UAUI_TABLE_CELL.share, sortable: true, sortAs: "number" },
            { key: "sessions", label: "Sessions", elementName: UAUI_TABLE_CELL.number, sortable: true, sortAs: "number", align: "end" },
        ];
        // Scrambled so a sort has real work to do.
        const rows = Array.from({ length: 1000 }, (_, i) => ({
            name: `Page ${(i * 7919) % 1000}`,
            views: (i * 7919) % 1013,
            sessions: (i * 104729) % 997,
        }));
        // 100 is the biggest page size the footer offers, so it is the heaviest page to draw.
        const mountTable = async () => {
            const el = mount("uaui-data-table", { mode: "client", columns, rows, pageSize: 100 });
            document.body.append(el);
            await settle(el);
            // Guard against timing a table that drew nothing: one full page of body rows.
            expect(el.shadowRoot!.querySelectorAll("uui-table-row:not([part~='header']):not(.summary)")).toHaveLength(100);
            return el;
        };
        const header = (el: Element, label: string) =>
            [...el.shadowRoot!.querySelectorAll("uui-table-head-cell")].find((h) => h.textContent?.includes(label)) as HTMLElement;

        timed("sorts and redraws a page in under 50 ms (median of 7 clicks)", async () => {
            const el = await mountTable();
            const ms = await medianOf(async () => {
                const start = performance.now();
                header(el, "Views").click();
                await settle(el);
                return performance.now() - start;
            });
            console.log(`[perf] table 1000 rows sort: median ${ms.toFixed(1)} ms`);
            expect(ms).toBeLessThan(50);
        });

        timed("sorts text in under 50 ms (median of 7 clicks)", async () => {
            const el = await mountTable();
            const ms = await medianOf(async () => {
                const start = performance.now();
                header(el, "Name").click();
                await settle(el);
                return performance.now() - start;
            });
            console.log(`[perf] table 1000 rows text sort: median ${ms.toFixed(1)} ms`);
            expect(ms).toBeLessThan(50);
        });

        timed("moves to another page in under 50 ms (median of 7)", async () => {
            const el = await mountTable();
            let page = 1;
            const ms = await medianOf(async () => {
                page = page === 1 ? 2 : 1;
                const start = performance.now();
                el.page = page;
                await settle(el);
                return performance.now() - start;
            });
            console.log(`[perf] table 1000 rows page: median ${ms.toFixed(1)} ms`);
            expect(ms).toBeLessThan(50);
        });
    });
});
