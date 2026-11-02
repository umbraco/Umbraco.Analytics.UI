import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { css, customElement, html, property, query, repeat } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { regionSource, sourceDocs } from "../internal/story/source.js";
import raw from "./custom-chart.story.ts?raw";
import { ArcElement, Chart, DoughnutController, Tooltip, type ChartData } from "@umbraco/analytics-ui/external/chart.js";
import { UauiPaletteStyles } from "../theme/index.js";

const imports = `import { css, customElement, html, property, query, repeat } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UauiPaletteStyles } from "@umbraco/analytics-ui";
// The site's one copy of Chart.js, shared with uaui-time-series-chart. Never import from "chart.js": that bundles another.
import { ArcElement, Chart, DoughnutController, Tooltip, type ChartData } from "@umbraco/analytics-ui/external/chart.js";`;

// #region chart
// Controllers, elements and Chart.js's own plugins live in the shared registry. Registering them again is harmless.
Chart.register(DoughnutController, ArcElement, Tooltip);

interface ExampleSlice {
    label: string;
    value: number;
}

/**
 * A product's own doughnut chart on the shared Chart.js. Slices take the package's series colours
 * (`--uaui-color-series-1` to `-4`), so they match `uaui-time-series-chart` in every theme and follow a product's
 * `--uaui-series-N` override. A canvas can't read CSS custom properties, so each colour is read back from a probe
 * element as a computed `color`. The legend is HTML, as ours is.
 */
@customElement("example-device-doughnut")
class ExampleDeviceDoughnutElement extends UmbLitElement {
    @property() label = "";
    @property({ attribute: false }) slices: ExampleSlice[] = [];

    @query("canvas") private _canvas!: HTMLCanvasElement;
    @query(".probe") private _probe!: HTMLElement;

    #chart?: Chart<"doughnut">;

    #color(expression: string): string {
        this._probe.style.color = expression;
        return getComputedStyle(this._probe).color;
    }

    #data(): ChartData<"doughnut"> {
        return {
            labels: this.slices.map((slice) => slice.label),
            datasets: [
                {
                    data: this.slices.map((slice) => slice.value),
                    backgroundColor: this.slices.map((_, i) => this.#color(`var(--uaui-color-series-${(i % 4) + 1})`)),
                    borderColor: this.#color("var(--uui-color-surface)"),
                    borderWidth: 2,
                },
            ],
        };
    }

    override updated() {
        if (this.#chart) {
            this.#chart.data = this.#data();
            this.#chart.update();
            return;
        }
        this.#chart = new Chart<"doughnut">(this._canvas, {
            type: "doughnut",
            data: this.#data(),
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "65%",
                // Everything is set on this chart, never on Chart.defaults, which every product shares. Set each
                // Chart.js plugin you rely on, on or off: another product may have registered Legend or Title.
                plugins: {
                    legend: { display: false },
                    title: { display: false },
                    tooltip: { enabled: true },
                },
            },
        });
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        this.#chart?.destroy();
        this.#chart = undefined;
    }

    override render() {
        return html`
            <span class="probe" aria-hidden="true"></span>
            <div class="canvas"><canvas role="img" aria-label=${this.label}></canvas></div>
            <ul class="legend">
                ${repeat(
                    this.slices,
                    (slice) => slice.label,
                    (slice, i) => html`<li>
                        <span class="swatch" style="background-color: var(--uaui-color-series-${(i % 4) + 1})"></span>
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
            .probe {
                display: none;
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
