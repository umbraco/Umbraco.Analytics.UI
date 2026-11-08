// What the chart isolation specs share (CHT-6): a fingerprint of a chart's pixels, a settled baseline, the comparison
// with diagnostics, and the changes a careless product makes to the shared Chart.js (each undone after the spec).
import { Chart, type Plugin } from "#platform/chart";
import { afterEach, expect } from "vitest";
import { chartSnapshot, environmentSnapshot, writeChartDiagnostics } from "./chart-diagnostics.js";
import { settle, shadow, type UauiTestElement } from "./dom.js";

export const canvasOf = (el: Element) => shadow(el).querySelector("canvas")!;
export const chartOf = (el: Element) => Chart.getChart(canvasOf(el))!;
export const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

/**
 * A short fingerprint of the drawn canvas, so a failure prints two hashes rather than two images. A browser may move a
 * canvas to another drawing path once it is read back (e.g. from GPU to CPU), and the two paths can anti-alias an edge
 * differently. So the chart is read once, then drawn again and read: every canvas compared is drawn the same way.
 */
export const pixels = async (el: UauiTestElement) => {
    await settle(el);
    await nextFrame();
    const canvas = canvasOf(el);
    const context = canvas.getContext("2d")!;
    context.getImageData(0, 0, 1, 1);
    chartOf(el).draw();
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let hash = 2166136261;
    for (let i = 0; i < data.length; i++) hash = Math.imul(hash ^ data[i], 16777619);
    return `${canvas.width}x${canvas.height}:${(hash >>> 0).toString(16)}`;
};

/**
 * The baseline, read once the chart has stopped changing. A chart redraws after its first paint (once
 * `document.fonts` settles, after a resize, on a theme stylesheet change), and the baseline is read only once, so a
 * read between the first paint and that redraw would be a picture the chart never ends on. The chart drawn after the
 * product's changes is polled, so it may settle in its own time. Same pixels are still required.
 */
const settledPixels = async (el: UauiTestElement) => {
    await document.fonts.ready;
    let last = await pixels(el);
    let same = 0;
    for (let i = 0; i < 50 && same < 3; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const next = await pixels(el);
        same = next === last ? same + 1 : 0;
        last = next;
    }
    return last;
};

/** The settled baseline, with what the chart resolved, for the diagnostics if the second chart doesn't match it. */
export const baseline = async (el: UauiTestElement) => ({
    hash: await settledPixels(el),
    png: canvasOf(el).toDataURL(),
    snapshot: chartSnapshot(chartOf(el)),
    environment: environmentSnapshot(el),
});

// Every change is undone after each spec, as Chart.defaults and the registry are shared by the whole test run.
const undo: (() => void)[] = [];
export const change = <T extends object, K extends keyof T>(target: T, key: K, value: T[K]) => {
    const before = target[key];
    target[key] = value;
    undo.push(() => (target[key] = before));
};
export const register = (...items: Plugin[]) => {
    Chart.register(...items);
    undo.push(() => Chart.unregister(...items));
};
const undoAll = () => {
    while (undo.length) undo.pop()!();
};
afterEach(undoAll);

/**
 * Same pixels as the baseline. On a mismatch, writes both canvases and what each chart resolved (see
 * chart-diagnostics.ts), and draws a third chart (`control`) with the product's changes undone.
 */
export const expectSamePixels = async (before: Awaited<ReturnType<typeof baseline>>, after: UauiTestElement, control: () => Promise<UauiTestElement>) => {
    try {
        await expect.poll(() => pixels(after)).toBe(before.hash);
    } catch (error) {
        const afterHash = await pixels(after);
        await writeChartDiagnostics(expect.getState().currentTestName ?? "isolation", before, {
            png: canvasOf(after).toDataURL(),
            snapshot: chartSnapshot(chartOf(after)),
            environment: environmentSnapshot(after),
        });
        // A third chart with the product's changes undone tells a leak (it matches the first) from the browser
        // drawing the same chart differently (it doesn't).
        undoAll();
        const controlHash = await pixels(await control());
        console.warn(`[chart-diagnostics] before ${before.hash}, after ${afterHash}, control without the changes ${controlHash}`);
        throw error;
    }
};

/** The Chart.js defaults a product is most likely to change for its own charts. */
export const changeCommonDefaults = () => {
    const d = Chart.defaults;
    // A family no browser uses by default: Firefox's default, "serif", would match ours on a page without a UUI font.
    change(d, "font", { family: "ProductFont, fantasy", size: 20, style: "italic", weight: "bold", lineHeight: 2 });
    change(d, "color", "rgb(255, 0, 0)");
    change(d, "borderColor", "rgb(0, 255, 0)");
    change(d, "indexAxis", "y");
    change(d, "events", ["click"]);
    change(d.animation as object as { duration: number }, "duration", 2000);
    change(d.layout, "padding", 30);
    change(d.elements.bar, "borderRadius", 8);
    change(d.elements.line, "stepped", true);
    change(d.elements.line, "tension", 0.4);
    change(d.elements.point, "pointStyle", "rectRot");
    change(d.scale.grid, "lineWidth", 4);
    change(d.scale.ticks, "padding", 20);
    change(d.scale.ticks as object as { minRotation: number }, "minRotation", 45);
    change(d.scale.grid, "tickLength", 30);
    change(d.scale, "reverse", true);
    change(d.scale as object as { position: string }, "position", "right");
    change(d, "clip", 20);
    change(d.plugins.tooltip, "position", "nearest");
};

/** Rarer changes: data parsing, number locale, and the per-type `Chart.overrides`. */
export const changeDataDefaultsAndOverrides = () => {
    const d = Chart.defaults as unknown as Record<string, unknown>;
    change(d, "parsing", false);
    change(d, "normalized", true);
    change(d, "locale", "ar-EG");
    const o = Chart.overrides as unknown as Record<"line" | "bar", Record<string, unknown>>;
    change(o.line, "showLine", false);
    change(o.line, "spanGaps", false);
    change(o.bar, "indexAxis", "y");
    change(o.bar, "grouped", false);
};
