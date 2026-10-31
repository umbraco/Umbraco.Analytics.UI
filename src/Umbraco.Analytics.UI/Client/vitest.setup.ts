// Adapted from Umbraco UI's vitest.setup.ts so tests read the same across both libraries.
import "@umbraco-ui/uui/themes/light.css";
import { type AxeResults } from "axe-core";
import { beforeAll, expect } from "vitest";
import { registerUauiTranslations } from "./src/internal/test/localization.js";
import type { ExpectationResult } from "@vitest/expect";

/**
 * Custom Vitest matcher: expect(await axeRun(el)).toHaveNoViolations()
 */
expect.extend({
    toHaveNoViolations(results: AxeResults): ExpectationResult {
        const violations = results.violations;

        if (violations.length === 0) {
            return {
                pass: true,
                message: () => "Expected accessibility violations but found none",
            };
        }

        const messages = violations.map((v) => {
            const nodes = v.nodes.map((n) => `  - ${n.html}`).join("\n");
            return `${v.id} (${v.impact}): ${v.description}\n${nodes}`;
        });

        return {
            pass: false,
            message: () =>
                `Expected no accessibility violations but found ${violations.length}:\n\n${messages.join("\n\n")}`,
        };
    },
});

// Type parameters must match Vitest's own Matchers declaration exactly
declare module "vitest" {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown> {
        toHaveNoViolations(): R;
    }
}

// Every test renders translated text, not keys.
beforeAll(registerUauiTranslations);
