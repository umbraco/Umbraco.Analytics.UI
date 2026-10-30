// TBL-10 — Server mode wiring helper
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { customElement, html, LitElement, ref } from "@umbraco-cms/backoffice/external/lit";
import { render } from "vitest-browser-lit";
import { nextEvent, shadow } from "../internal/test/dom.js";
import "./data-table.element.js";
import type { UaxDataTableElement } from "./data-table.element.js";
import { pageColumns } from "./table-fixtures.js";
import { UaxTableServerController, type UaxTableServerResult, type UaxTableServerState } from "./table-server.controller.js";

type Result = UaxTableServerResult & { label: string };

/** A request the test answers by hand, so it decides the order the answers arrive in. */
type Pending = { state: UaxTableServerState; signal: AbortSignal; resolve: (result: Result) => void; reject: (error: unknown) => void };

const answer = (label: string, rows = 1): Result => ({
    label,
    rows: Array.from({ length: rows }, (_, i) => ({ url: `https://example.com/${label}/${i}`, pageviews: 1, sessions: 1 })),
    compareRows: [{ url: "https://example.com/old", pageviews: 1, sessions: 1 }],
    totalRows: 99,
    stats: { pageviews: { total: 500, max: 50 } },
});

let requests: Pending[];
let errors: unknown[];

@customElement("test-server-table-host")
class TestServerTableHost extends LitElement {
    table = new UaxTableServerController<Result>(this, {
        sort: { key: "pageviews", direction: "desc" },
        pageSize: 25,
        load: (state, signal) =>
            new Promise<Result>((resolve, reject) => {
                requests.push({ state, signal, resolve, reject });
            }),
        onError: (error) => errors.push(error),
    });

    override render() {
        return html`<uax-data-table .columns=${pageColumns} ${ref(this.table.attach)}></uax-data-table>
            <output>${this.table.result?.label ?? "none"}</output>`;
    }
}

@customElement("test-no-retry-table-host")
class TestNoRetryTableHost extends LitElement {
    table = new UaxTableServerController<Result>(this, {
        retryable: false,
        load: (state, signal) =>
            new Promise<Result>((resolve, reject) => {
                requests.push({ state, signal, resolve, reject });
            }),
    });

    override render() {
        return html`<uax-data-table .columns=${pageColumns} ${ref(this.table.attach)}></uax-data-table>`;
    }
}

@customElement("test-swapping-table-host")
class TestSwappingTableHost extends LitElement {
    table = new UaxTableServerController<Result>(this, {
        sort: { key: "pageviews", direction: "desc" },
        load: (state, signal) =>
            new Promise<Result>((resolve, reject) => {
                requests.push({ state, signal, resolve, reject });
            }),
    });

    /** Which of two templates draws the table: lit makes a new element when it changes. */
    flip = false;

    override render() {
        return this.flip
            ? html`<section><uax-data-table id="b" .columns=${pageColumns} ${ref(this.table.attach)}></uax-data-table></section>`
            : html`<uax-data-table id="a" .columns=${pageColumns} ${ref(this.table.attach)}></uax-data-table>`;
    }
}

const tableOf = (host: Element) => shadow(host).querySelector("uax-data-table") as UaxDataTableElement;
const labelOf = (host: Element) => shadow(host).querySelector("output")!.textContent;

async function renderHost() {
    const host = render(html`<test-server-table-host></test-server-table-host>`).container.querySelector(
        "test-server-table-host",
    ) as TestServerTableHost;
    await host.updateComplete;
    return host;
}

/** Raises an event as the table does when the editor acts, after setting its own state. */
function raise(table: Element, name: string, detail: unknown) {
    table.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
}

beforeEach(() => {
    requests = [];
    errors = [];
});

describe("Feature: server mode wiring helper", () => {
    describe("Scenario: the host connects", () => {
        let host: TestServerTableHost;
        beforeEach(async () => {
            host = await renderHost();
        });

        it("loads the first page with the starting state", () => {
            expect(requests.map((r) => r.state)).toEqual([
                { sort: { key: "pageviews", direction: "desc" }, page: 1, pageSize: 25, query: "" },
            ]);
        });

        it("sets the table to server mode", () => {
            expect(tableOf(host).mode).toBe("server");
        });

        it("shows the table loading", () => {
            expect(tableOf(host).loading).toBe(true);
        });

        it("shows the starting sort on the table", () => {
            expect(tableOf(host).sort).toEqual({ key: "pageviews", direction: "desc" });
        });

        it("shows the starting page size on the table", () => {
            expect(tableOf(host).pageSize).toBe(25);
        });
    });

    describe("Scenario: the page loads", () => {
        let host: TestServerTableHost;
        beforeEach(async () => {
            host = await renderHost();
            requests[0].resolve(answer("first", 3));
            await expect.poll(() => tableOf(host).loading).toBe(false);
        });

        it("gives the table the rows", () => {
            expect(tableOf(host).rows).toHaveLength(3);
        });

        it("gives the table the compare rows", () => {
            expect(tableOf(host).compareRows).toHaveLength(1);
        });

        it("gives the table the total row count", () => {
            expect(tableOf(host).totalRows).toBe(99);
        });

        it("gives the table the stats", () => {
            expect(tableOf(host).stats).toEqual({ pageviews: { total: 500, max: 50 } });
        });

        it("hands the whole answer back to the page", async () => {
            await host.updateComplete;
            expect(labelOf(host)).toBe("first");
        });
    });

    describe("Scenario: the editor sorts", () => {
        let host: TestServerTableHost;
        beforeEach(async () => {
            host = await renderHost();
            requests[0].resolve(answer("first"));
            await expect.poll(() => tableOf(host).loading).toBe(false);
            raise(tableOf(host), "page-change", { page: 3, pageSize: 25 });
            requests[1].resolve(answer("page 3"));
            await expect.poll(() => tableOf(host).loading).toBe(false);
            raise(tableOf(host), "sort-change", { key: "sessions", direction: "asc" });
        });

        it("loads with the new sort", () => {
            expect(requests[2].state.sort).toEqual({ key: "sessions", direction: "asc" });
        });

        it("goes back to page 1", () => {
            expect(requests[2].state.page).toBe(1);
        });

        it("keeps the page size", () => {
            expect(requests[2].state.pageSize).toBe(25);
        });
    });

    describe("Scenario: the editor searches", () => {
        let host: TestServerTableHost;
        beforeEach(async () => {
            host = await renderHost();
            requests[0].resolve(answer("first"));
            await expect.poll(() => tableOf(host).loading).toBe(false);
            raise(tableOf(host), "page-change", { page: 2, pageSize: 25 });
            requests[1].resolve(answer("page 2"));
            await expect.poll(() => tableOf(host).loading).toBe(false);
            raise(tableOf(host), "search", { query: "contact" });
        });

        it("loads with the query", () => {
            expect(requests[2].state.query).toBe("contact");
        });

        it("goes back to page 1", () => {
            expect(requests[2].state.page).toBe(1);
        });

        it("shows the query on the table", () => {
            expect(tableOf(host).query).toBe("contact");
        });

        it("does not load again for the same query", () => {
            raise(tableOf(host), "search", { query: "contact" });
            expect(requests).toHaveLength(3);
        });
    });

    describe("Scenario: the editor pages", () => {
        let host: TestServerTableHost;
        beforeEach(async () => {
            host = await renderHost();
            requests[0].resolve(answer("first"));
            await expect.poll(() => tableOf(host).loading).toBe(false);
            raise(tableOf(host), "page-change", { page: 2, pageSize: 50 });
        });

        it("loads that page and size", () => {
            expect(requests[1].state).toMatchObject({ page: 2, pageSize: 50 });
        });
    });

    describe("Scenario: a newer request starts before the older one answers", () => {
        let host: TestServerTableHost;
        beforeEach(async () => {
            host = await renderHost();
            raise(tableOf(host), "search", { query: "b" });
        });

        it("aborts the older request", () => {
            expect(requests[0].signal.aborted).toBe(true);
        });

        it("does not abort the newer request", () => {
            expect(requests[1].signal.aborted).toBe(false);
        });

        it("drops the older answer when it still arrives", async () => {
            requests[1].resolve(answer("newer", 2));
            await expect.poll(() => tableOf(host).loading).toBe(false);
            requests[0].resolve(answer("older", 5));
            await Promise.resolve();
            await host.updateComplete;
            expect(tableOf(host).rows).toHaveLength(2);
        });

        it("drops an older answer that arrives first", async () => {
            requests[0].resolve(answer("older", 5));
            await Promise.resolve();
            await host.updateComplete;
            expect(tableOf(host).loading).toBe(true);
        });

        it("keeps no older answer for the page", async () => {
            requests[0].resolve(answer("older", 5));
            requests[1].resolve(answer("newer", 2));
            await expect.poll(() => tableOf(host).loading).toBe(false);
            await host.updateComplete;
            expect(labelOf(host)).toBe("newer");
        });
    });

    describe("Scenario: reload", () => {
        let host: TestServerTableHost;
        beforeEach(async () => {
            host = await renderHost();
            requests[0].resolve(answer("first"));
            await expect.poll(() => tableOf(host).loading).toBe(false);
            raise(tableOf(host), "page-change", { page: 4, pageSize: 25 });
            requests[1].resolve(answer("page 4"));
            await expect.poll(() => tableOf(host).loading).toBe(false);
        });

        it("loads the same state again", () => {
            void host.table.reload();
            expect(requests[2].state.page).toBe(4);
        });

        it("goes back to page 1 on request", () => {
            void host.table.reload({ resetPage: true });
            expect(requests[2].state.page).toBe(1);
        });

        it("shows page 1 on the table", () => {
            void host.table.reload({ resetPage: true });
            expect(tableOf(host).page).toBe(1);
        });

        it("keeps the old rows while loading", () => {
            void host.table.reload();
            expect(tableOf(host).rows).toHaveLength(1);
        });

        it("resolves once its request ends", async () => {
            const done = host.table.reload();
            requests[2].resolve(answer("again"));
            await expect(done).resolves.toBeUndefined();
        });
    });

    describe("Scenario (sad path): the request fails", () => {
        let host: TestServerTableHost;
        const failure = new Error("boom");
        beforeEach(async () => {
            host = await renderHost();
            requests[0].resolve(answer("first"));
            await expect.poll(() => tableOf(host).loading).toBe(false);
            void host.table.reload();
            requests[1].reject(failure);
            await expect.poll(() => tableOf(host).loading).toBe(false);
        });

        it("exposes the error", () => {
            expect(host.table.error).toBe(failure);
        });

        it("tells the page", () => {
            expect(errors).toEqual([failure]);
        });

        it("keeps the old rows", () => {
            expect(tableOf(host).rows).toHaveLength(1);
        });

        it("clears the error on the next request", () => {
            void host.table.reload();
            expect(host.table.error).toBeUndefined();
        });

        it("sets the table's error", () => {
            expect(tableOf(host).error).toBe(true);
        });

        it("lets the table offer Retry", () => {
            expect(tableOf(host).retryable).toBe(true);
        });

        it("loads the same state again when the table raises retry", () => {
            tableOf(host).dispatchEvent(new Event("retry", { bubbles: true }));
            expect(requests).toHaveLength(3);
        });

        it("clears the table's error when the next load starts", () => {
            void host.table.reload();
            expect(tableOf(host).error).toBe(false);
        });

        it("keeps the table's error cleared after the next load succeeds", async () => {
            void host.table.reload();
            requests[2].resolve(answer("second"));
            await expect.poll(() => tableOf(host).loading).toBe(false);
            expect(tableOf(host).error).toBe(false);
        });
    });

    describe("Scenario (sad path): the request fails with retryable false", () => {
        it("leaves the table's retryable false", async () => {
            const host = render(html`<test-no-retry-table-host></test-no-retry-table-host>`).container.querySelector(
                "test-no-retry-table-host",
            ) as TestNoRetryTableHost;
            await host.updateComplete;
            requests[0].reject(new Error("boom"));
            const table = shadow(host).querySelector("uax-data-table") as UaxDataTableElement;
            await expect.poll(() => table.error).toBe(true);
            expect(table.retryable).toBe(false);
        });
    });

    describe("Scenario (sad path): an aborted request rejects", () => {
        let host: TestServerTableHost;
        beforeEach(async () => {
            host = await renderHost();
            raise(tableOf(host), "search", { query: "b" });
            requests[0].reject(new DOMException("aborted", "AbortError"));
            await Promise.resolve();
        });

        it("is not an error", () => {
            expect(host.table.error).toBeUndefined();
        });

        it("is not reported", () => {
            expect(errors).toEqual([]);
        });
    });

    describe("Scenario: the host leaves the page", () => {
        let host: TestServerTableHost;
        beforeEach(async () => {
            host = await renderHost();
            host.remove();
        });

        it("aborts the request", () => {
            expect(requests[0].signal.aborted).toBe(true);
        });
    });

    describe("Scenario: the table is replaced", () => {
        let host: TestServerTableHost;
        let old: UaxDataTableElement;
        beforeEach(async () => {
            host = await renderHost();
            old = tableOf(host);
            requests[0].resolve(answer("first"));
            await expect.poll(() => old.loading).toBe(false);
            host.table.attach(undefined);
        });

        it("stops listening to the old table", () => {
            raise(old, "search", { query: "x" });
            expect(requests).toHaveLength(1);
        });
    });

    describe("Scenario: events of the table are the ones the controller listens to", () => {
        it("keeps the table's own sort-change event", async () => {
            const host = await renderHost();
            requests[0].resolve(answer("first"));
            await expect.poll(() => tableOf(host).loading).toBe(false);
            const event = nextEvent(tableOf(host), "sort-change");
            [...shadow(tableOf(host)).querySelectorAll<HTMLElement>("uui-table-head-cell")][2].click();
            await event;
            expect(requests[1].state.sort).toEqual({ key: "sessions", direction: "desc" });
        });
    });
});

describe("Feature: the table behind the controller changes", () => {
    describe("Scenario: the host draws another table", () => {
        let host: TestSwappingTableHost;
        let next: UaxDataTableElement;
        beforeEach(async () => {
            host = render(html`<test-swapping-table-host></test-swapping-table-host>`).container.querySelector(
                "test-swapping-table-host",
            ) as TestSwappingTableHost;
            await host.updateComplete;
            requests[0].resolve(answer("first", 3));
            await expect.poll(() => (shadow(host).querySelector("#a") as UaxDataTableElement).loading).toBe(false);
            raise(shadow(host).querySelector("#a")!, "page-change", { page: 2, pageSize: 25 });
            requests[1].resolve(answer("page 2", 3));
            await expect.poll(() => (shadow(host).querySelector("#a") as UaxDataTableElement).loading).toBe(false);
            host.flip = true;
            host.requestUpdate();
            await host.updateComplete;
            next = shadow(host).querySelector("#b") as UaxDataTableElement;
        });

        it("gives the new table the rows of the last result", () => {
            expect(next.rows).toHaveLength(3);
        });

        it("gives the new table the current page and sort", () => {
            expect([next.page, next.sort]).toEqual([2, { key: "pageviews", direction: "desc" }]);
        });

        it("lets the new table's events drive loads", () => {
            raise(next, "search", { query: "x" });
            expect(requests[2].state.query).toBe("x");
        });
    });
});

describe("Feature: the host is disconnected", () => {
    describe("Scenario: its request is aborted and then rejects", () => {
        let host: TestServerTableHost;
        beforeEach(async () => {
            host = await renderHost();
            host.remove();
            requests[0].reject(new DOMException("aborted", "AbortError"));
            await Promise.resolve();
        });

        it("sets no error", () => {
            expect(host.table.error).toBeUndefined();
        });

        it("reports nothing", () => {
            expect(errors).toEqual([]);
        });
    });

    describe("Scenario: reload while disconnected", () => {
        let host: TestServerTableHost;
        beforeEach(async () => {
            host = await renderHost();
            host.remove();
            await host.table.reload();
        });

        it("starts no request", () => {
            expect(requests).toHaveLength(1);
        });
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});
