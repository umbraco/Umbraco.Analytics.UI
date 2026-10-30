import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbBasicState, UmbObjectState } from "@umbraco-cms/backoffice/observable-api";
import { UAX_TABLE_CONTEXT, type UaxTableContext } from "../table-context.js";
import type { UaxTableColumn, UaxTableCompareLookup, UaxTableStats } from "../types.js";

/** The context a table provides to its cells. Internal: the table sets the state, cells only read `UaxTableContext`. */
export class UaxTableContextController extends UmbContextBase implements UaxTableContext {
    // Basic states, not deep ones: a deep state would freeze the product's column objects.
    #columns = new UmbBasicState<UaxTableColumn[]>([]);
    #stats = new UmbObjectState<UaxTableStats>({});
    #compare = new UmbBasicState<UaxTableCompareLookup>(() => undefined);

    readonly columns = this.#columns.asObservable();
    readonly stats = this.#stats.asObservable();
    readonly compare = this.#compare.asObservable();

    constructor(host: UmbControllerHost) {
        super(host, UAX_TABLE_CONTEXT);
    }

    setColumns(columns: UaxTableColumn[]) {
        this.#columns.setValue(columns);
    }

    setStats(stats: UaxTableStats) {
        this.#stats.setValue(stats);
    }

    setCompare(lookup: UaxTableCompareLookup) {
        this.#compare.setValue(lookup);
    }
}
