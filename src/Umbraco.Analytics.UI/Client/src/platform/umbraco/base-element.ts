import type { UmbLocalizationController as UauiLocalize } from "@umbraco-cms/backoffice/localization-api";

// Swap point: the base class of every element in this package. In the backoffice it is `UmbLitElement`.
export { UmbLitElement as UauiLitElement } from "@umbraco-cms/backoffice/lit-element";
// Swap point: what helpers need from `this.localize`. In the backoffice it is `UmbLocalizationController`, so the
// public API report keeps naming the backoffice type. `../localize.ts` holds the structural shape it must satisfy.
export type { UauiLocalize };
