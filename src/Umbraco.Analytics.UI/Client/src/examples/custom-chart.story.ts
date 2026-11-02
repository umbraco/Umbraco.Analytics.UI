import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { css, customElement, html, property, query, repeat } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { regionSource, sourceDocs } from "../internal/story/source.js";
import raw from "./custom-chart.story.ts?raw";
import {
    ArcElement,
    Chart,
    DoughnutController,
    Tooltip,
    uauiChartColors,
    uauiChartOptions,
    uauiWatchTheme,
    type ChartData,
    type UauiChartColors,
} from "@umbraco/analytics-ui/external/chart.js";
import { UauiPaletteStyles } from "../theme/index.js";

const imports = `import { css, customElement, html, property, query, repeat } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UauiPaletteStyles } from "@umbraco/analytics-ui";
// The site's one copy of Chart.js, shared with uaui-time-series-chart, plus the package's chart look.
// Never import from "chart.js": that bundles another.
import {
    ArcElement,
    Chart,
    DoughnutController,
    Tooltip,
    uauiChartColors,
    uauiChartOptions,
    uauiWatchTheme,
    type ChartData,
    type UauiChartColors,
} from "@umbraco/analytics-ui/external/chart.js";`;

// #region chart
interface ExampleSlice {
    label: string;
    value: number;
}

/**
 * A product's own doughnut chart on the shared Chart.js, in the package's look. `uauiChartColors` gives the slices the
 * package's series colours (`--uaui-color-bar-1` to `-4`), so they match `uaui-time-series-chart` in every theme and
 * follow a product's `--uaui-series-N` override; `uauiChartOptions` gives the font and the rest; `uauiWatchTheme`
 * recolours the chart when the backoffice theme changes. The element adds `UauiPaletteStyles`, where those colours
 * come from. The legend is HTML, as ours is.
 */
@customElement("example-device-doughnut")
class ExampleDeviceDoughnutElement extends UmbLitElement {
    @property() label = "";
    @property({ attribute: false }) slices: ExampleSlice[] = [];

    @query("canvas") private _canvas!: HTMLCanvasElement;

    #chart?: Chart<"doughnut">;
    #stopThemeWatch?: () => void;

    #data(colors: UauiChartColors): ChartData<"doughnut"> {
        return {
            labels: this.slices.map((slice) => slice.label),
            datasets: [
                {
                    data: this.slices.map((slice) => slice.value),
                    // Opaque slot colours, as the legend swatches below use.
                    backgroundColor: this.slices.map((_, i) => colors.series[i % 4].bar),
                },
            ],
        };
    }

    override updated() {
        const colors = uauiChartColors(this);
        if (this.#chart) {
            this.#chart.data = this.#data(colors);
            this.#chart.update();
            return;
        }
        // Register what this chart uses, here with the chart. Controllers, elements and Chart.js's own plugins can only
        // go in the shared registry; registering one again is harmless. Never change Chart.defaults.
        Chart.register(DoughnutController, ArcElement, Tooltip);
        const look = uauiChartOptions(this, "doughnut", colors);
        this.#chart = new Chart<"doughnut">(this._canvas, {
            type: "doughnut",
            data: this.#data(colors),
            options: {
                // The package look (font, colours, legend and title off, responsive), set on this chart.
                ...look,
                cutout: "65%",
                // Set each Chart.js plugin you rely on, on or off: another product may have registered it.
                plugins: { ...look.plugins, tooltip: { ...look.plugins?.tooltip, enabled: true } },
            },
        });
        // Recolour the slices when the backoffice theme changes. The look's own colours are updated for you.
        this.#stopThemeWatch = uauiWatchTheme(this, this.#chart, (next, chart) => {
            chart.data.datasets[0].backgroundColor = this.slices.map((_, i) => next.series[i % 4].bar);
        });
    }

    override connectedCallback() {
        super.connectedCallback();
        // The chart is destroyed on disconnect, so build it again on reconnect.
        if (this.hasUpdated) this.requestUpdate();
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        this.#stopThemeWatch?.();
        this.#stopThemeWatch = undefined;
        this.#chart?.destroy();
        this.#chart = undefined;
    }

    override render() {
        return html`
            <div class="canvas"><canvas role="img" aria-label=${this.label}></canvas></div>
            <ul class="legend">
                ${repeat(
                    this.slices,
                    (slice) => slice.label,
                    (slice, i) => html`<li>
                        <span class="swatch" style="background-color: var(--uaui-color-bar-${(i % 4) + 1})"></span>
                        ${slice.label}
                        <span class="value">${slice.value.toLocaleString(this.localize.lang())}</span>
                    </li>`,
                )}
            </ul>
        `;
    }

    static override styles = [
        UauiPaletteStyles,
        css`
            :host {
                display: flex;
                align-items: center;
                gap: var(--uui-size-space-5);
            }
            .canvas {
                position: relative;
                width: 180px;
                height: 180px;
            }
            .legend {
                list-style: none;
                margin: 0;
                padding: 0;
                display: grid;
                gap: var(--uui-size-space-2);
            }
            .swatch {
                display: inline-block;
                width: 10px;
                height: 10px;
                border-radius: 2px;
                margin-inline-end: var(--uui-size-space-2);
            }
            .value {
                margin-inline-start: var(--uui-size-space-3);
                color: var(--uui-color-text-alt);
                font-variant-numeric: tabular-nums;
            }
        `,
    ];
}
// #endregion

// #region usage
const devices = [
    { label: "Desktop", value: 5820 },
    { label: "Mobile", value: 4310 },
    { label: "Tablet", value: 960 },
    { label: "Other", value: 140 },
];

const renderDevices = () => html`
    <uui-box headline="Visitors by device">
        <example-device-doughnut label="Visitors by device" .slices=${devices}></example-device-doughnut>
    </uui-box>
`;
// #endregion

declare global {
    interface HTMLElementTagNameMap {
        "example-device-doughnut": ExampleDeviceDoughnutElement;
    }
}

const meta: Meta = {
    title: "Examples/Custom chart with the shared Chart.js",
    parameters: { layout: "padded" },
};

export default meta;

/**
 * A product's own doughnut on the site's shared Chart.js (`@umbraco/analytics-ui/external/chart.js`), coloured with the
 * package's palette. See [Custom charts with Chart.js](?path=/docs/guides-custom-charts-with-chart-js--docs) for the rules.
 * All data is made up.
 */
export const CustomChart: StoryObj = {
    name: "Custom chart with the shared Chart.js",
    render: () => renderDevices(),
    parameters: { docs: sourceDocs(`${regionSource(raw, "chart", imports)}\n${regionSource(raw, "usage")}`) },
};
