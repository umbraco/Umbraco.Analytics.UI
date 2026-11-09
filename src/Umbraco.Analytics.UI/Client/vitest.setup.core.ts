// The core project's own setup: nothing from @umbraco-cms, so a core spec can't pass on backoffice state.
import "@umbraco-ui/uui/themes/light.css";
import { afterEach, beforeEach } from "vitest";
import "./vitest.axe.js";

// The backoffice serves a bare `en` as en-GB, so specs written under it (day-first dates, and the chart screenshot
// baselines) expect en-GB. The core follows `<html lang>`, and a page with none formats as en-US, so say en-GB here.
document.documentElement.lang = "en-GB";

// Each test file runs in an iframe of the test page; give it focus first (see vitest.setup.ts).
beforeEach(() => {
    window.focus();
});

// The core's date range opener puts its dialog in a modal container on the body, which outlives the test that opened
// it (the Umbraco build's tests get the same clean-up from the modal host they render inside). Remove what a spec leaves
// open, so the next spec doesn't find an earlier spec's dialog.
afterEach(() => {
    document.querySelectorAll("uui-modal-dialog").forEach((modal) => modal.remove());
});
