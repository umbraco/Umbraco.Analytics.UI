import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { notPublicApi } from "../story/internal.js";
import "./compact-pager.element.js";
import type { CompactPagerChangeDetail, UaxCompactPagerElement } from "./compact-pager.element.js";

const meta: Meta<UaxCompactPagerElement> = {
    title: "Internal/Compact pager",
    component: "uax-compact-pager",
    tags: ["internal"],
    parameters: {
        docs: { description: { component: notPublicApi("`uax-compact-pager` is the paging controls `uax-data-table` uses: a page size picker, the range and previous and next. It isn't tied to tables. The host draws the border and padding.") } },
    },
    args: { page: 1, pageSize: 10, total: 272 },
    render: (args) => html`<uax-compact-pager
        .page=${args.page}
        .pageSize=${args.pageSize}
        .total=${args.total}
        @page-change=${(event: CustomEvent<CompactPagerChangeDetail>) => {
            // The pager is controlled: it only reports the choice, so the story applies it like the table does.
            const pager = event.target as UaxCompactPagerElement;
            pager.page = event.detail.page;
            pager.pageSize = event.detail.pageSize;
        }}></uax-compact-pager>`,
};

export default meta;
type Story = StoryObj<UaxCompactPagerElement>;

/** The first page: Previous is disabled. Use the buttons and the "Per page" select. */
export const FirstPage: Story = { name: "First page" };

/** The last page: Next is disabled, and the range ends at the total. */
export const LastPage: Story = { name: "Last page", args: { page: 28 } };

/** A few items only, one page. */
export const OnePage: Story = { name: "One page", args: { total: 8 } };
