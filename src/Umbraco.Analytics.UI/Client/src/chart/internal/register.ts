import {
    BarController,
    BarElement,
    CategoryScale,
    Chart,
    Filler,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    Tooltip,
} from "@umbraco/analytics-ui/external/chart.js";

// Only what the chart draws. Stacking is a scale option, so it needs no extra registration.
// TimeScale is left out: it needs a date adapter, and the x-axis uses pre-formatted labels instead.
// Chart.js is shared with the products, so this registry is too. Controllers, elements and scales can only be
// registered here, and Chart.js's own plugins need it as well (their option descriptors are only read once
// registered), so Filler and Tooltip are too. Our chart uses only Filler (it draws its own tooltip and the renderer
// turns Tooltip off for it), but Tooltip stays registered for products' own charts, which get it on by Chart.js's
// default unless they set `plugins.tooltip.enabled: false`. Don't remove it.
// We change no `Chart.defaults`, and the renderer turns off, per chart, every registered plugin it doesn't use.
Chart.register(LineController, LineElement, PointElement, BarController, BarElement, LinearScale, CategoryScale, Filler, Tooltip);
