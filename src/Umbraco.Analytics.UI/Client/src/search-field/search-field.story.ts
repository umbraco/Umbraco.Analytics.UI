import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UauiSearchFieldElement } from "./search-field.element.js";
import "./search-field.element.js";

const meta: Meta<UauiSearchFieldElement> = {
    title: "Components/Search Field",
    component: "uaui-search-field",
    args: { value: "" },
    render: (args) => html`<uaui-search-field .value=${args.value}></uaui-search-field>`,
};

export default meta;
type Story = StoryObj<UauiSearchFieldElement>;

/** Type, and `search` is raised 300ms after you stop. Inside a `uaui-data-table`'s `toolbar` slot the table filters itself; see Components › Data Table › Search. */
export const Default: Story = {};

/** With text in the box a compact clear button appears. Clicking it empties the box and raises `search` at once with an empty query. */
export const WithText: Story = { args: { value: "contact" } };
