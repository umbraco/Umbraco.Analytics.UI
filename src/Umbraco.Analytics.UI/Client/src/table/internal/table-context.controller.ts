import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbBasicState, UmbObjectState } from "@umbraco-cms/backoffice/observable-api";
import { UAUI_TABLE_CONTEXT, type UauiTableContext } from "../table-context.js";
import type { UauiTableColumn, UauiTableCompareLookup, UauiTableStats } from "../types.js";

/** The context a table provides to its cells. Internal: the table sets the state, cells only read `UauiTableContext`. */
export class UauiTableContextController extends UmbContextBase implements UauiTableContext {
    // Basic states, not deep ones: a deep state would freeze the product's column objects.
    #columns = new UmbBasicState<UauiTableColumn[]>([]);
    #stats = new UmbObjectState<UauiTableStats>({});
    #compare = new UmbBasicState<UauiTableCompareLookup>(() => undefined);

    readonly columns = this.#columns.asObservable();
    readonly stats = this.#stats.asObservable();
    readonly compare = this.#compare.asObservable();

    constructor(host: UmbControllerHost) {
        super(host, UAUI_TABLE_CONTEXT);
    }

    setColumns(columns: UauiTableColumn[]) {
        this.#columns.setValue(columns);
    }

    setStats(stats: UauiTableStats) {
        this.#stats.setValue(stats);
    }

    setCompare(lookup: UauiTableCompareLookup) {
        this.#compare.setValue(lookup);
    }
}
