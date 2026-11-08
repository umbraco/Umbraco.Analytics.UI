// The core project's own setup: nothing from @umbraco-cms, so a core spec can't pass on backoffice state.
import "@umbraco-ui/uui/themes/light.css";
import { beforeEach } from "vitest";
import "./vitest.axe.js";

// Each test file runs in an iframe of the test page; give it focus first (see vitest.setup.ts).
beforeEach(() => {
    window.focus();
});
