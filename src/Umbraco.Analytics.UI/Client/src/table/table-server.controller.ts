import type { ReactiveController, ReactiveControllerHost } from "@umbraco-cms/backoffice/external/lit";
import type { UaxDataTableElement } from "./data-table.element.js";
import type { UaxTablePageChangeDetail, UaxTableSearchDetail, UaxTableSort, UaxTableSortChangeDetail, UaxTableStats } from "./types.js";

/** Shared so a table with no answer yet keeps the same arrays and doesn't work its columns out again. */
const NO_ROWS: Record<string, unknown>[] = [];

/** What a product's loader is asked for: the table's sort, page, page size and search, as the editor left them. */
export type UaxTableServerState = {
    /** The column the editor sorted by, or what `sort` in the options said at the start. */
    sort?: UaxTableSort;
    /** The page to load, starting at 1. */
    page: number;
    /** Rows per page. */
    pageSize: number;
    /** What the editor searched for. Empty when nothing is. */
    query: string;
};

/** What a loader answers with. The controller gives each field to the table. Add your own fields: `result` hands them back. */
export type UaxTableServerResult = {
    /** The rows of the requested page. */
    rows: Record<string, unknown>[];
    /** Last period's rows, for the compare badges. */
    compareRows?: Record<string, unknown>[];
    /** How many rows match across every page. */
    totalRows?: number;
    /** Each column's total and largest value across every page. */
    stats?: UaxTableStats;
};

/** Loads one page. Pass `signal` on to `fetch`: it aborts when a newer request starts or the host leaves the page. */
export type UaxTableServerLoader<TResult extends UaxTableServerResult> = (
    state: Readonly<UaxTableServerState>,
    signal: AbortSignal,
) => Promise<TResult>;

/** The options of a `UaxTableServerController`. */
export interface UaxTableServerOptions<TResult extends UaxTableServerResult> {
    /** Loads the page for a state. Reject with the error when the request fails. */
    load: UaxTableServerLoader<TResult>;
    /** The sort to start with. Show it on the table's header too: the controller sets it. */
    sort?: UaxTableSort;
    /** The page to start on. Defaults to 1. */
    page?: number;
    /** Rows per page to start with. Defaults to 10, the table's own default. */
    pageSize?: number;
    /** The search to start with. Defaults to none. */
    query?: string;
    /** Called when `load` rejects with something other than an abort, after `error` is set. */
    onError?: (error: unknown) => void;
}

/**
 * Runs the server side of a `uax-data-table` in `server` mode, so a product doesn't write the wiring again. It keeps
 * the sort, page, page size and search from the table's `sort-change`, `page-change` and `search` events, goes back to
 * page 1 on a sort or search, calls `load` with that state, and gives the answer to the table: `rows`,
 * `compareRows`, `totalRows`, `stats` and `loading`. A newer request aborts the one before it (its `AbortSignal`) and an
 * older answer that still arrives is dropped, so the table never shows a page the editor has left. The host
 * leaving the page aborts the request too.
 *
 * Create it on the page element and attach it to the table with `ref`:
 * `<uax-data-table ${ref(this.#table.attach)}>`. The controller sets `mode` to `server` and every property above. The
 * page keeps `columns`, `row-key` and the slots. Call `reload()` when something the loader reads changes, such as
 * the date range. The host updates whenever `loading`, `result` or `error` change, so a template can read them.
 *
 * A reactive controller rather than a CMS collection context: a table is a leaf element, so nothing needs to find
 * the state through the context tree, and the controller works on any `ReactiveControllerHost`.
 */
export class UaxTableServerController<TResult extends UaxTableServerResult = UaxTableServerResult> implements ReactiveController {
    readonly #host: ReactiveControllerHost;
    readonly #options: UaxTableServerOptions<TResult>;
    #state: UaxTableServerState;
    #table?: UaxDataTableElement;
    #abort?: AbortController;
    #request = 0;
    #connected = false;
    #loading = false;
    #result?: TResult;
    #error?: unknown;

    constructor(host: ReactiveControllerHost, options: UaxTableServerOptions<TResult>) {
        this.#host = host;
        this.#options = options;
        this.#state = {
            sort: options.sort,
            page: options.page ?? 1,
            pageSize: options.pageSize ?? 10,
            query: options.query ?? "",
        };
        host.addController(this);
    }

    /** The sort, page, page size and search the next load will use. */
    get state(): Readonly<UaxTableServerState> {
        return this.#state;
    }

    /** Whether a request is on its way. */
    get loading(): boolean {
        return this.#loading;
    }

    /** The answer of the last request that finished and wasn't dropped, with any fields of your own. `undefined` before the first. */
    get result(): TResult | undefined {
        return this.#result;
    }

    /** What the last request rejected with, or `undefined` while it works and after a success. The table keeps its old rows. */
    get error(): unknown {
        return this.#error;
    }

    /**
     * Attaches the table: pass it to `ref` on the `uax-data-table`. The table gets the state and the last answer at once,
     * and its `sort-change`, `page-change` and `search` events drive the loads. Called with `undefined` when the table goes.
     */
    readonly attach = (element?: Element): void => {
        const table = element as UaxDataTableElement | undefined;
        if (table === this.#table) return;
        this.#detach();
        if (!table) return;
        this.#table = table;
        table.addEventListener("sort-change", this.#onSortChange);
        table.addEventListener("page-change", this.#onPageChange);
        table.addEventListener("search", this.#onSearch);
        this.#apply();
    };

    /** Loads the state again, for when something the loader reads changes. Does nothing while the host is disconnected: it loads on reconnect. `resetPage` goes back to page 1 first. Resolves when that request ends, dropped or not. */
    reload(options: { resetPage?: boolean } = {}): Promise<void> {
        if (options.resetPage) this.#state = { ...this.#state, page: 1 };
        return this.#run();
    }

    /** Loads the first page, or again after the host was moved. Called by the host. */
    hostConnected(): void {
        this.#connected = true;
        void this.#run();
    }

    /** Aborts the request on its way. Called by the host. */
    hostDisconnected(): void {
        this.#connected = false;
        this.#abort?.abort();
    }

    #detach() {
        const table = this.#table;
        if (!table) return;
        table.removeEventListener("sort-change", this.#onSortChange);
        table.removeEventListener("page-change", this.#onPageChange);
        table.removeEventListener("search", this.#onSearch);
        this.#table = undefined;
    }

    // The table has already moved to page 1, so the state follows it.
    #onSortChange = (event: Event) => {
        this.#state = { ...this.#state, sort: (event as CustomEvent<UaxTableSortChangeDetail>).detail, page: 1 };
        void this.#run();
    };

    #onPageChange = (event: Event) => {
        const { page, pageSize } = (event as CustomEvent<UaxTablePageChangeDetail>).detail;
        this.#state = { ...this.#state, page, pageSize };
        void this.#run();
    };

    #onSearch = (event: Event) => {
        const query = (event as CustomEvent<UaxTableSearchDetail>).detail?.query;
        if (typeof query !== "string" || query === this.#state.query) return;
        this.#state = { ...this.#state, query, page: 1 };
        void this.#run();
    };

    async #run(): Promise<void> {
        // A host that is away starts nothing: the next `hostConnected` loads the state as it is by then.
        if (!this.#connected) return;
        this.#abort?.abort();
        const abort = new AbortController();
        this.#abort = abort;
        const request = ++this.#request;
        this.#loading = true;
        this.#error = undefined;
        this.#apply();
        try {
            const result = await this.#options.load({ ...this.#state }, abort.signal);
            if (request !== this.#request || abort.signal.aborted) return;
            this.#result = result;
        } catch (error) {
            // An aborted request is one this controller gave up on, not a failure.
            if (request !== this.#request || abort.signal.aborted) return;
            this.#error = error;
            this.#loading = false;
            this.#apply();
            this.#options.onError?.(error);
            return;
        }
        this.#loading = false;
        this.#apply();
    }

    /** Gives the table the state and the last answer, and asks the host to draw again. */
    #apply() {
        const table = this.#table;
        if (table) {
            const result = this.#result;
            table.mode = "server";
            table.sort = this.#state.sort;
            table.page = this.#state.page;
            table.pageSize = this.#state.pageSize;
            table.query = this.#state.query;
            table.rows = result?.rows ?? NO_ROWS;
            table.compareRows = result?.compareRows ?? NO_ROWS;
            table.totalRows = result?.totalRows;
            table.stats = result?.stats;
            table.loading = this.#loading;
        }
        this.#host.requestUpdate();
    }
}
