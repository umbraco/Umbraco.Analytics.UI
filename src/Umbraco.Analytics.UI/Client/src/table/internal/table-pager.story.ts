import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { notPublicApi } from "../../internal/story/internal.js";
import type { UaxTablePageChangeDetail } from "../types.js";
import "./table-pager.element.js";
import type { UaxTablePagerElement } from "./table-pager.element.js";

const meta: Meta<UaxTablePagerElement> = {
    title: "Internal/Table pager",
    component: "uax-table-pager",
    tags: ["internal"],
    parameters: {
        docs: { description: { component: notPublicApi("`uax-table-pager` is the footer of `uax-data-table`.") } },
    },
    args: { page: 1, pageSize: 10, total: 272 },
    render: (args) => html`<uax-table-pager
        .page=${args.page}
        .pageSize=${args.pageSize}
        .total=${args.total}
        @page-change=${(event: CustomEvent<UaxTablePageChangeDetail>) => {
            // The pager is controlled: it only reports the choice, so the story applies it like the table does.
            const pager = event.target as UaxTablePagerElement;
            pager.page = event.detail.page;
            pager.pageSize = event.detail.pageSize;
        }}></uax-table-pager>`,
};

export default meta;
type Story = StoryObj<UaxTablePagerElement>;

/** The first page: Previous is disabled. Use the buttons and the "Show rows" select. */
export const FirstPage: Story = { name: "First page" };

/** The last page: Next is disabled, and the range ends at the total. */
export const LastPage: Story = { name: "Last page", args: { page: 28 } };

/** A few rows only, one page. */
export const OnePage: Story = { name: "One page", args: { total: 8 } };
