// Core swap point: Lit from the `lit` package itself. Named re-exports only: an `export *` from an external module
// makes the bundler add a namespace shim. tsc and the Umbraco-side names must match what src imports from #platform/lit.
export { css, html, LitElement, nothing } from "lit";
export type { CSSResult, CSSResultGroup, PropertyValues, ReactiveController, ReactiveControllerHost, TemplateResult } from "lit";
export { customElement, property, query, state } from "lit/decorators.js";
export { ifDefined } from "lit/directives/if-defined.js";
export { repeat } from "lit/directives/repeat.js";
