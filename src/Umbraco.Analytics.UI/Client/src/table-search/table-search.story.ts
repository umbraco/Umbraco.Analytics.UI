import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UaxTableSearchElement } from "./table-search.element.js";
import "./table-search.element.js";

const meta: Meta<UaxTableSearchElement> = {
    title: "Components/Table Search",
    component: "uax-table-search",
    args: { value: "" },
    render: (args) => html`<uax-table-search .value=${args.value}></uax-table-search>`,
};

export default meta;
type Story = StoryObj<UaxTableSearchElement>;

/** Type, and `search` is raised 300ms after you stop. Inside a `uax-data-table`'s `toolbar` slot the table filters itself; see Components › Data Table › Search. */
export const Default: Story = {};

/** With text in the box a compact clear button appears. Clicking it empties the box and raises `search` at once with an empty query. */
export const WithText: Story = { args: { value: "contact" } };
