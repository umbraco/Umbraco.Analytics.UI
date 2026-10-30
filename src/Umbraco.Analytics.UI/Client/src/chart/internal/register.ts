import { CategoryScale, Chart, Filler, LinearScale, LineController, LineElement, PointElement, Tooltip } from "chart.js";

// Only what the chart draws, so the bundle stays small. The bar kind adds BarController and BarElement.
// TimeScale is left out: it needs a date adapter, and the x-axis uses pre-formatted labels instead.
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);
