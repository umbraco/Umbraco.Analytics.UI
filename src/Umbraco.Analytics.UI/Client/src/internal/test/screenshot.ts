import { it } from "vitest";
import { server } from "vitest/browser";

/**
 * Whether screenshot specs run here: Chromium on Linux only. A canvas renders slightly differently per
 * engine and OS (fonts, anti-aliasing), so baselines are one set, made in the pinned Playwright Linux
 * container (`npm run test:screenshots`, and the CI test jobs). Everywhere else the specs skip,
 * so a Mac run or the Firefox and WebKit runs don't compare against the wrong baseline.
 */
export const screenshotsEnabled = server.browser === "chromium" && server.platform === "linux";

/**
 * `it` for a spec that uses `toMatchScreenshot`. Skipped unless `screenshotsEnabled`.
 * Use `screenshotIt.skip` for a spec that is still pending.
 */
export const screenshotIt = it.skipIf(!screenshotsEnabled);
