// Core swap point: Chart.js, plus the look helpers that src imports from #platform/chart.
// Re-exports `chart.js` directly (the core bundles its own copy, so the shared entry and its cache-buster rule don't
// apply) and takes the helpers from look.ts, so they stay in one place. Named list, not `export *`: no bundler shim.
export {
    BarController, BarElement, CategoryScale, Chart, Colors, Filler, Legend, LineController, LineElement,
    LinearScale, PointElement, Title, Tooltip, registry,
} from "chart.js";
export type { CartesianScaleOptions, ChartConfiguration, Plugin } from "chart.js";
export { uauiChartColors, uauiChartOptions, uauiWatchTheme, type UauiChartColors } from "../../external/chart.js/look.js";
