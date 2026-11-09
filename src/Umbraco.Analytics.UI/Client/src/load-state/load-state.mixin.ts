import { property } from "#platform/lit";
import type { HTMLElementConstructor, UauiLitElement } from "#platform/base-element";
import { getLoadingMode, isBusy, type UauiLoadingMode } from "../internal/loading/loading-mode.js";

export type { UauiLoadingMode };

/**
 * The load states a data element shares (`uaui-time-series-chart`, `uaui-category-chart`, `uaui-funnel`,
 * `uaui-data-table`): `loading`, `error` with its texts and Retry, and the empty state's texts, with the same attribute
 * names and defaults on each. The element decides where it draws each state. Error wins over loading, and loading over
 * empty.
 */
export declare class UauiLoadStateMixinInterface {
    /** Shows a skeleton on first load, or a loading bar over the old data when reloading. */
    loading: boolean;

    /**
     * The load failed. Shows `uaui-error-state` in place of the data (the table keeps its header), and wins over
     * `loading` and the empty state.
     */
    error: boolean;

    /** Headline of the error state. Defaults to the translation of "Something went wrong". */
    errorHeadline?: string;

    /** Description of the error state. Defaults to the translation of "The data could not be loaded.". */
    errorDescription?: string;

    /** Shows a Retry button in the error state. Pressing it raises `retry` on the element. */
    retryable: boolean;

    /** Headline of the empty state. Defaults to the translation of "No data yet". */
    emptyHeadline?: string;

    /**
     * Description of the empty state. Defaults to the translation of "Try a wider date range." (on
     * `uaui-category-chart`, "There is nothing to show yet.").
     */
    emptyDescription?: string;

    /**
     * What to show while loading: `"skeleton"` (loading with nothing to show yet), `"reload"` (loading with data shown:
     * keep it, under a loading bar) or `"idle"` (not loading, or in `error`: show the data, the empty state when
     * `hasData` is false, or the error state).
     */
    protected loadingMode(hasData: boolean): UauiLoadingMode;

    /** Whether the element is busy for assistive tech (`aria-busy`): loading, and not in `error`. */
    protected isBusy(): boolean;

    /**
     * Raises `retry` on the element: a plain `Event` that bubbles, is not composed and can't be canceled. Bind it to the
     * error state's own `retry`, which stops at the element's shadow root: `@retry=${this.dispatchRetry}` (Lit calls it
     * with the element as `this`).
     */
    protected dispatchRetry(): void;
}

/**
 * Adds the shared load states (`UauiLoadStateMixinInterface`) to `superClass`: `UauiLoadStateMixin(UmbLitElement)`.
 * The class's own type is inferred, so a subclass of `UmbLitElement` keeps its members.
 *
 * @param superClass - The class to extend, `UmbLitElement` or a subclass of it.
 * @returns The class with the shared load states.
 */
export const UauiLoadStateMixin = <T extends HTMLElementConstructor<UauiLitElement>>(superClass: T): HTMLElementConstructor<UauiLoadStateMixinInterface> & T => {
    class UauiLoadStateMixinClass extends superClass {
        /** Shows a skeleton on first load, or a loading bar over the old data when reloading. */
        @property({ type: Boolean, reflect: true })
        loading = false;

        /**
         * The load failed. Shows `uaui-error-state` in place of the data (the table keeps its header), and wins over
         * `loading` and the empty state.
         */
        @property({ type: Boolean, reflect: true })
        error = false;

        /** Headline of the error state. Defaults to the translation of "Something went wrong". */
        @property({ type: String, attribute: "error-headline" })
        errorHeadline?: string;

        /** Description of the error state. Defaults to the translation of "The data could not be loaded.". */
        @property({ type: String, attribute: "error-description" })
        errorDescription?: string;

        /** Shows a Retry button in the error state. Pressing it raises `retry` on the element. */
        @property({ type: Boolean })
        retryable = false;

        /** Headline of the empty state. Defaults to the translation of "No data yet". */
        @property({ type: String, attribute: "empty-headline" })
        emptyHeadline?: string;

        /**
         * Description of the empty state. Defaults to the translation of "Try a wider date range." (on
         * `uaui-category-chart`, "There is nothing to show yet.").
         */
        @property({ type: String, attribute: "empty-description" })
        emptyDescription?: string;

        protected loadingMode(hasData: boolean): UauiLoadingMode {
            return getLoadingMode(this.loading, hasData, this.error);
        }

        protected isBusy(): boolean {
            return isBusy(this.loading, this.error);
        }

        protected dispatchRetry(): void {
            this.dispatchEvent(new Event("retry", { bubbles: true }));
        }
    }
    return UauiLoadStateMixinClass as unknown as HTMLElementConstructor<UauiLoadStateMixinInterface> & T;
};
