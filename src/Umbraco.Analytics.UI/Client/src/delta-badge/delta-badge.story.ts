import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UauiDeltaBadgeElement } from "./delta-badge.element.js";
import "./delta-badge.element.js";

const meta: Meta<UauiDeltaBadgeElement> = {
  title: "Components/Delta Badge",
  component: "uaui-delta-badge",
  args: {
    value: 12.4,
    unit: "percent",
    lowerIsBetter: false,
    maxDecimals: 1,
    size: "md",
  },
  argTypes: {
    unit: { control: "inline-radio", options: ["percent", "points"] },
    size: { control: "inline-radio", options: ["md", "sm"] },
  },
  render: (args) =>
    html`<uaui-delta-badge
      .value=${args.value}
      .current=${args.current}
      .previous=${args.previous}
      .unit=${args.unit}
      .lowerIsBetter=${args.lowerIsBetter}
      .maxDecimals=${args.maxDecimals}
      .size=${args.size}
    ></uaui-delta-badge>`,
};

export default meta;
type Story = StoryObj<UauiDeltaBadgeElement>;

export const Increase: Story = {};

export const Decrease: Story = { args: { value: -3 } };

/** A change that rounds to zero is neutral. A `value` of exactly 0 looks the same. */
export const NoChange: Story = { args: { value: 0.02 } };

/** Percentage points: 0 reads "0 pp", neutral, "no change". With no `value` the change is unknown and nothing is drawn. */
export const NoChangePoints: Story = { args: { value: 0, unit: "points" } };

/** A fall in refund rate is good, so it shows green. */
export const LowerIsBetter: Story = {
  args: { value: -1.2, unit: "points", lowerIsBetter: true },
};

/** Give the two numbers instead of the change: 150 against 120 is +25%. */
export const FromTwoNumbers: Story = {
  args: { value: undefined, current: 150, previous: 120 },
};

/** Two percentages give a change in points: 3.1% against 4.3% is -1.2 pp. */
export const FromTwoPercentages: Story = {
  args: {
    value: undefined,
    current: 3.1,
    previous: 4.3,
    unit: "points",
    lowerIsBetter: true,
  },
};

/** The compact size used in table cells. */
export const Small: Story = { args: { size: "sm" } };

export const AllStates: Story = {
  render: () =>
    html`<div style="display:flex;flex-direction:column;gap:12px">
      ${(["md", "sm"] as const).map(
        (size) =>
          html`<div
            style="display:flex;gap:16px;flex-wrap:wrap;align-items:center"
          >
            <uaui-delta-badge .value=${12.4} .size=${size}></uaui-delta-badge>
            <uaui-delta-badge .value=${-3} .size=${size}></uaui-delta-badge>
            <uaui-delta-badge .value=${0} .size=${size}></uaui-delta-badge>
            <uaui-delta-badge
              .value=${-1.2}
              unit="points"
              lower-is-better
              .size=${size}
            ></uaui-delta-badge>
            <uaui-delta-badge
              .value=${4.5}
              unit="points"
              lower-is-better
              .size=${size}
            ></uaui-delta-badge>
          </div>`,
      )}
    </div>`,
};
