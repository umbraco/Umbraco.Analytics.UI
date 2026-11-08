// Test-only: what a Chart.js chart resolved, so a pixel mismatch on CI can be explained from the log and artifacts
// instead of from two hashes. Files go to test-results/chart-diagnostics/, which CI publishes when tests fail.
import { commands } from "vitest/browser";
import type { Chart } from "#platform/chart";

type Snapshot = Record<string, unknown>;

/** A plain copy of an object Chart.js resolved (options are Proxies over several scopes), to a fixed depth. */
function plain(value: unknown, depth = 5, seen = new WeakSet<object>()): unknown {
    if (value === null || typeof value !== "object") return typeof value === "function" ? "[function]" : value;
    if (seen.has(value) || depth === 0) return "[…]";
    seen.add(value);
    if (Array.isArray(value)) return value.slice(0, 20).map((item) => plain(item, depth - 1, seen));
    const out: Snapshot = {};
    let keys: string[] = [];
    try {
        keys = Object.keys(value);
    } catch {
        return "[unreadable]";
    }
    for (const key of keys) {
        if (key.startsWith("_") || key.startsWith("$") || key === "chart" || key === "ctx") continue;
        try {
            out[key] = plain((value as Record<string, unknown>)[key], depth - 1, seen);
        } catch {
            out[key] = "[throws]";
        }
    }
    return out;
}

/** What the chart drew with: its options, every scale's options and box, every dataset's element options and clip. */
export function chartSnapshot(chart: Chart): Snapshot {
    const canvas = chart.canvas;
    return {
        canvas: {
            width: canvas.width,
            height: canvas.height,
            cssWidth: canvas.getBoundingClientRect().width,
            cssHeight: canvas.getBoundingClientRect().height,
            currentDevicePixelRatio: chart.currentDevicePixelRatio,
            ctxFont: chart.ctx.font,
        },
        chartArea: plain(chart.chartArea),
        options: plain(chart.options, 4),
        scales: Object.fromEntries(
            Object.entries(chart.scales).map(([id, scale]) => [
                id,
                {
                    box: { left: scale.left, top: scale.top, width: scale.width, height: scale.height },
                    ticks: scale.ticks.map((tick) => tick.label),
                    options: plain(scale.options, 4),
                },
            ]),
        ),
        datasets: chart.data.datasets.map((_, i) => {
            const meta = chart.getDatasetMeta(i) as unknown as {
                type: string;
                _clip: unknown;
                dataset?: { options: unknown };
                data: { x: number; y: number; options: unknown }[];
            };
            return {
                type: meta.type,
                clip: plain(meta._clip),
                line: plain(meta.dataset?.options, 3),
                points: meta.data.map((point) => ({ x: point.x, y: point.y })),
                firstElement: plain(meta.data[0]?.options, 3),
            };
        }),
    };
}

/** Where the browser and its fonts stand: the user agent, the screen ratio and which families resolve. */
export function environmentSnapshot(host: Element): Snapshot {
    const probe = host.shadowRoot?.querySelector<HTMLElement>(".probe");
    return {
        userAgent: navigator.userAgent,
        devicePixelRatio: window.devicePixelRatio,
        hostFontFamily: getComputedStyle(host).fontFamily,
        probeFontFamily: probe ? getComputedStyle(probe).fontFamily : undefined,
        fontsStatus: document.fonts.status,
        fontsChecks: Object.fromEntries(
            ["11px ProductFont", "11px fantasy", "11px serif", "11px sans-serif", "11px -webkit-standard", '11px "Times New Roman"', "11px Lato"].map(
                (font) => [font, document.fonts.check(font)],
            ),
        ),
        loadedFaces: [...document.fonts].map((face) => `${face.family} ${face.weight} ${face.status}`),
    };
}

/** Every path whose value differs between two snapshots, as `path: before -> after`. */
export function snapshotDiff(before: unknown, after: unknown, path = ""): string[] {
    if (JSON.stringify(before) === JSON.stringify(after)) return [];
    const isObject = (value: unknown) => value !== null && typeof value === "object";
    if (!isObject(before) || !isObject(after)) return [`${path || "(root)"}: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`];
    const keys = new Set([...Object.keys(before as object), ...Object.keys(after as object)]);
    return [...keys].flatMap((key) =>
        snapshotDiff((before as Snapshot)[key], (after as Snapshot)[key], path ? `${path}.${key}` : key),
    );
}

/**
 * Writes both canvases as PNGs and the two snapshots, their diff and the environment as JSON to
 * test-results/chart-diagnostics/<name>/, and logs the diff and environment.
 */
export async function writeChartDiagnostics(
    name: string,
    before: { png: string; snapshot: Snapshot; environment: Snapshot },
    after: { png: string; snapshot: Snapshot; environment: Snapshot },
): Promise<void> {
    const folder = `test-results/chart-diagnostics/${name.replace(/[^a-z0-9-]+/gi, "-")}`;
    const diff = snapshotDiff({ snapshot: before.snapshot, environment: before.environment }, { snapshot: after.snapshot, environment: after.environment });
    const base64 = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(",") + 1);
    try {
        await commands.writeFile(`${folder}/before.png`, base64(before.png), "base64");
        await commands.writeFile(`${folder}/after.png`, base64(after.png), "base64");
        await commands.writeFile(`${folder}/diagnostics.json`, JSON.stringify({ diff, before, after }, null, 2));
    } catch (error) {
        console.warn(`[chart-diagnostics] could not write files: ${String(error)}`);
    }
    console.warn(`[chart-diagnostics] ${name}\nenvironment: ${JSON.stringify(after.environment)}\ndiff:\n${diff.join("\n") || "(no option differs)"}`);
}
