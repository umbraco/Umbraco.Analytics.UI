/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import "./delta-badge.element.js";
import type { UauiDeltaBadgeElement } from "./delta-badge.element.js";

describe("UauiDeltaBadgeElement", () => {
  let element: UauiDeltaBadgeElement;

  beforeEach(async () => {
    element = render(
      html`<uaui-delta-badge .value=${12.4}></uaui-delta-badge>`,
    ).container.querySelector("uaui-delta-badge")!;
    await element.updateComplete;
  });

  // Renders every sentiment on the surface, optionally under a real UUI theme stylesheet, and audits it.
  async function auditAllSentiments(themeCss?: string) {
    const theme = document.createElement("style");
    if (themeCss) {
      theme.textContent = themeCss;
      document.head.appendChild(theme);
    }
    try {
      const host = render(
        html`<div style="background: var(--uui-color-surface); padding: 8px">
          <uaui-delta-badge .value=${12.4}></uaui-delta-badge>
          <uaui-delta-badge .value=${-3}></uaui-delta-badge>
          <uaui-delta-badge .value=${0}></uaui-delta-badge>
        </div>`,
      ).container.querySelector("div")!;
      await Promise.all(
        [...host.querySelectorAll("uaui-delta-badge")].map(
          (b) => b.updateComplete,
        ),
      );
      return await axeRun(host);
    } finally {
      theme.remove();
    }
  }

  it("passes the a11y audit in the light theme, for every sentiment", async () => {
    expect(await auditAllSentiments()).toHaveNoViolations();
  });

  it("passes the a11y audit in the dark theme, for every sentiment", async () => {
    expect(await auditAllSentiments(darkCss)).toHaveNoViolations();
  });

  it("passes the a11y audit in the high contrast theme, for every sentiment", async () => {
    expect(await auditAllSentiments(highContrastCss)).toHaveNoViolations();
  });

  it("shows a signed percent change", () => {
    expect(element.shadowRoot!.textContent).toContain("+12.4%");
  });

  it("renders nothing without a value", async () => {
    element.value = undefined;
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector(".badge")).toBe(null);
  });

  describe("no change and unknown", () => {
    it("shows a zero percent change as 0%", async () => {
      element.value = 0;
      await element.updateComplete;
      expect(
        element.shadowRoot!.querySelector(".badge")!.textContent,
      ).toContain("0%");
    });

    it("shows a zero points change as 0 pp", async () => {
      element.value = 0;
      element.unit = "points";
      await element.updateComplete;
      expect(
        element.shadowRoot!.querySelector(".badge")!.textContent,
      ).toContain("0 pp");
    });

    it("is neutral at 0", async () => {
      element.value = 0;
      await element.updateComplete;
      expect(element.sentiment).toBe("neutral");
    });

    it("reads 0 as no change", async () => {
      element.value = 0;
      await element.updateComplete;
      expect(
        element.shadowRoot!.querySelector(".visually-hidden")!.textContent,
      ).toContain("no change");
    });

    it("renders nothing for a value that is not finite", async () => {
      element.value = Number.POSITIVE_INFINITY;
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector(".badge")).toBe(null);
    });
  });

  describe("direction and sentiment", () => {
    it("treats a rise as positive", () => {
      expect(element.direction).toBe("up");
      expect(element.sentiment).toBe("positive");
    });

    it("treats a fall as negative", async () => {
      element.value = -3;
      await element.updateComplete;
      expect(element.direction).toBe("down");
      expect(element.sentiment).toBe("negative");
    });

    it("flips sentiment when lower is better", async () => {
      element.value = -1.2;
      element.lowerIsBetter = true;
      await element.updateComplete;
      expect(element.sentiment).toBe("positive");
    });

    it("treats a change that rounds to zero as flat", async () => {
      element.value = 0.02;
      await element.updateComplete;
      expect(element.direction).toBe("flat");
      expect(element.sentiment).toBe("neutral");
    });
  });

  it("shows percentage points", async () => {
    element.value = -1.2;
    element.unit = "points";
    await element.updateComplete;
    expect(element.shadowRoot!.textContent).toContain("-1.2 pp");
  });

  it("says in text that a fall is an improvement when lower is better", async () => {
    element.value = -1.2;
    element.unit = "points";
    element.lowerIsBetter = true;
    await element.updateComplete;
    expect(
      element.shadowRoot!.querySelector(".visually-hidden")!.textContent,
    ).toContain("improvement");
  });

  describe("worked out from current and previous", () => {
    async function badge(
      current: number,
      previous: number,
      unit: "percent" | "points" = "percent",
    ) {
      element.value = undefined;
      element.current = current;
      element.previous = previous;
      element.unit = unit;
      await element.updateComplete;
      return element;
    }

    it("shows the percent change", async () => {
      expect((await badge(150, 120)).shadowRoot!.textContent).toContain("+25%");
    });

    it("measures a fall against the size of the previous value", async () => {
      expect((await badge(-30, -20)).shadowRoot!.textContent).toContain("-50%");
    });

    it("shows the difference in percentage points", async () => {
      expect(
        (await badge(3.1, 4.3, "points")).shadowRoot!.textContent,
      ).toContain("-1.2 pp");
    });

    it("renders nothing when the previous value is 0", async () => {
      expect(
        (await badge(5, 0)).shadowRoot!.querySelector(".badge"),
      ).toBeNull();
    });

    it("renders nothing with only a current value", async () => {
      element.value = undefined;
      element.current = 5;
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector(".badge")).toBeNull();
    });

    it("uses value over current and previous", async () => {
      element.current = 150;
      element.previous = 120;
      await element.updateComplete;
      expect(element.shadowRoot!.textContent).toContain("+12.4%");
    });

    it("takes its direction from the worked-out change", async () => {
      expect((await badge(80, 100)).direction).toBe("down");
    });

    it("passes the a11y audit", async () => {
      expect(await axeRun(await badge(150, 120))).toHaveNoViolations();
    });
  });
});
