import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { notPublicApi } from "../../internal/story/internal.js";
import type { UaxCompareGroupChangeDetail, UaxCompareGroupElement } from "./compare-group.element.js";
import "./compare-group.element.js";

const meta: Meta<UaxCompareGroupElement> = {
    title: "Internal/Compare group",
    component: "uax-compare-group",
    tags: ["internal"],
    parameters: {
        docs: { description: { component: notPublicApi("`uax-compare-group` is the Compare switch and comparison fields of the date range dialog.") } },
    },
    args: {
        range: { from: "2026-05-25", to: "2026-06-23" },
        compare: undefined,
        maxDate: "2026-06-23",
        errors: {},
    },
    render: (args) => html`<div style="width: 560px">
        <uax-compare-group
            .range=${args.range}
            .compare=${args.compare}
            max-date=${args.maxDate}
            .errors=${args.errors}
            @change=${(event: CustomEvent<UaxCompareGroupChangeDetail>) => {
                // The group is controlled: it reports the new comparison, so the story applies it like the dialog does.
                (event.target as UaxCompareGroupElement).compare = event.detail.compare;
            }}></uax-compare-group>
    </div>`,
};

export default meta;
type Story = StoryObj<UaxCompareGroupElement>;

/** Compare is off: only the switch. */
export const Off: Story = {};

/** Compare is on, as the previous period. */
export const On: Story = { args: { compare: { mode: "previous-period", from: "2026-04-25", to: "2026-05-24" } } };

/** A custom comparison with an end before its start. */
export const WithError: Story = {
    name: "With error",
    args: {
        compare: { mode: "custom", from: "2026-04-20", to: "2026-04-01" },
        errors: { to: "The end date must be on or after the start date." },
    },
};
