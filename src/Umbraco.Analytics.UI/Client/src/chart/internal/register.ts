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
} from "chart.js";

// Only what the chart draws, so the bundle stays small. Stacking is a scale option, so it needs no extra registration.
// TimeScale is left out: it needs a date adapter, and the x-axis uses pre-formatted labels instead.
Chart.register(LineController, LineElement, PointElement, BarController, BarElement, LinearScale, CategoryScale, Filler, Tooltip);
