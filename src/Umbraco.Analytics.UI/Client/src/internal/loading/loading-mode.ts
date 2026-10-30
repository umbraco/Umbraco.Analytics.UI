/**
 * What a data element shows for its `loading` property.
 *
 * - `skeleton`: loading with nothing to show yet (first load). Render `uax-skeleton` instead of the content.
 * - `reload`: loading with data already shown. Keep the content and add `uax-loading-bar` over its top edge.
 * - `idle`: not loading. Render the content, or the empty state when there is no data.
 *
 * `hasData` means "there is something to show", e.g. `series.length > 0` or `rows.length > 0`.
 */
export type UaxLoadingMode = "skeleton" | "reload" | "idle";

export function getLoadingMode(loading: boolean, hasData: boolean): UaxLoadingMode {
    if (!loading) return "idle";
    return hasData ? "reload" : "skeleton";
}
