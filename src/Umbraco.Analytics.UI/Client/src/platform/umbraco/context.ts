import type { UmbContextMinimal, UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import type { UmbControllerHost as UauiContextProviderHost } from "@umbraco-cms/backoffice/controller-api";
import type { Observable } from "@umbraco-cms/backoffice/external/rxjs";

// Swap point: contexts and observable state. In the backoffice they are the backoffice's own, so the public API
// report keeps naming `UmbContextToken` and rxjs `Observable`. The core build points #platform/context at its own.
export { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
export { UmbBasicState, UmbObjectState } from "@umbraco-cms/backoffice/observable-api";
export type { UmbContextMinimal } from "@umbraco-cms/backoffice/context-api";
export type { Observable, UauiContextProviderHost };
// Provider side: a class that provides a context for its host's descendants. The core build implements it with the
// community `context-request` protocol on a plain LitElement host (a ReactiveControllerHost and HTMLElement).
export { UmbContextBase as UauiContextBase } from "@umbraco-cms/backoffice/class-api";

/** What the helpers need from an element: its own `consumeContext` and `observe`. `UmbLitElement` has both. */
export interface UauiContextHost {
    consumeContext<T extends UmbContextMinimal>(token: UmbContextToken<T, T>, callback: (value: T | undefined) => void): unknown;
    // `any` here because the backoffice types the callback value from its source; the helper below keeps callers typed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    observe(source: Observable<any> | undefined, callback: (value: any) => void, alias?: string): unknown;
}

/** Calls `callback` with the context `token` names, from the nearest provider above `host`, and again if it changes. */
export function consumeContext<T extends UmbContextMinimal>(host: UauiContextHost, token: UmbContextToken<T, T>, callback: (value: T | undefined) => void): void {
    host.consumeContext(token, callback);
}

/**
 * Calls `callback` with each value `source` emits, for as long as `host` is connected. `alias` replaces an earlier
 * observer of the same alias. When `source` is undefined, `callback` is called with undefined (every implementation keeps this).
 */
export function observe<T>(host: UauiContextHost, source: Observable<T> | undefined, callback: (value: T | undefined) => void, alias?: string): void {
    host.observe(source, callback, alias);
}
