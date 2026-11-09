// SAC-11 AC1–AC3 — standalone core package.
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "#platform/lit";
import "#platform/uui";
import { UUIIconRegistry } from "@umbraco-ui/uui";
import {
  renderElement,
  shadow,
  type UauiTestElement,
} from "../../internal/test/dom.js";
import "../../error-state/error-state.element.js";
import "./icons.js";

const NAMES = [
  "icon-alert",
  "icon-search",
  "icon-calendar",
  "icon-navigation-left",
  "icon-navigation-right",
  "icon-delete",
];

type Settleable = HTMLElement & { updateComplete: Promise<boolean> };

// uui-icon fills in the SVG from a promise, so let it render, resolve, and render again.
const settle = async (icon: Settleable) => {
  await icon.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await icon.updateComplete;
};

const iconOf = (el: Element) =>
  shadow(el).querySelector("uui-icon") as Settleable;

const requestIcon = async (name: string): Promise<boolean> => {
  const icon = document.createElement("uui-icon") as Settleable;
  icon.setAttribute("name", name);
  document.body.append(icon);
  await settle(icon);
  const found = icon.shadowRoot!.querySelector("svg") !== null;
  icon.remove();
  return found;
};

describe("Feature: Icons in the core", () => {
  describe("Scenario: Our icons show with no registry", () => {
    let el: UauiTestElement;
    beforeEach(async () => {
      el = await renderElement(
        html`<uaui-error-state></uaui-error-state>`,
        "uaui-error-state",
      );
      await settle(iconOf(el));
    });

    it("its uui-icon has an SVG for icon-alert", () => {
      expect(shadow(iconOf(el)).querySelector("svg")).not.toBe(null);
    });
  });

  describe("Scenario: Every built-in icon is covered", () => {
    it("each resolves to an SVG", async () => {
      const unresolved: string[] = [];
      for (const name of NAMES) {
        if (!(await requestIcon(name))) unresolved.push(name);
      }
      expect(unresolved).toEqual([]);
    });
  });

  describe("Sad path", () => {
    describe("Scenario: A registry attached to document wins", () => {
      const HOST_SVG =
        '<svg viewBox="0 0 1 1"><path id="doc-alert" d="M0 0"/></svg>';
      let registry: UUIIconRegistry;
      let el: UauiTestElement;
      beforeEach(async () => {
        registry = new UUIIconRegistry();
        registry.defineIcon("icon-alert", HOST_SVG);
        registry.attach(document);
        el = await renderElement(
          html`<uaui-error-state></uaui-error-state>`,
          "uaui-error-state",
        );
        await settle(iconOf(el));
        return () => registry.detach(document);
      });

      it("the icon is the registry's, not ours", () => {
        expect(shadow(iconOf(el)).querySelector("#doc-alert")).not.toBe(null);
      });
    });

    describe("Scenario: The host's registry wins", () => {
      const HOST_SVG =
        '<svg viewBox="0 0 1 1"><path id="host-alert" d="M0 0"/></svg>';
      let el: UauiTestElement;
      beforeEach(async () => {
        const registry = document.createElement(
          "uui-icon-registry",
        ) as HTMLElement & { registry: UUIIconRegistry };
        registry.registry.defineIcon("icon-alert", HOST_SVG);
        document.body.append(registry);
        el = document.createElement(
          "uaui-error-state",
        ) as unknown as UauiTestElement;
        registry.append(el);
        await el.updateComplete;
        await settle(iconOf(el));
        return () => registry.remove();
      });

      it("the icon is the registry's, not ours", () => {
        expect(shadow(iconOf(el)).querySelector("#host-alert")).not.toBe(null);
      });
    });
  });
});
