// SAC-10 AC1–AC3 — standalone core package.
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-lit";
import { customElement, html, LitElement } from "#platform/lit";
import "#platform/uui";
import { consumeContext, observe, UauiBasicState } from "./context.js";
import { UAUI_TABLE_CONTEXT, type UauiTableContext } from "../../table/table-context.js";
import "../../table/data-table.element.js";
import { settle, type UauiTestElement } from "../../internal/test/dom.js";
import type { UauiTableColumn } from "../../table/types.js";

/** What `@lit/context` and any plain-code consumer sends: a bubbling, composed event with these fields. */
function requestContext(from: Element, subscribe: boolean, onAnswer: (value: unknown) => void) {
    const event = new Event("context-request", { bubbles: true, composed: true });
    Object.assign(event, { context: UAUI_TABLE_CONTEXT, callback: onAnswer, subscribe });
    from.dispatchEvent(event);
}

/** A cell written with no helpers: it is a plain element that fires the event itself. */
@customElement("uaui-test-plain-cell")
class PlainCellElement extends LitElement {
    received: UauiTableContext[] = [];
    override connectedCallback() {
        super.connectedCallback();
        requestContext(this, true, (value) => this.received.push(value as UauiTableContext));
    }
}

const columns: UauiTableColumn[] = [
    { key: "url", label: "URL" },
    { key: "n", label: "N", elementName: "uaui-test-plain-cell" },
];
const moreColumns: UauiTableColumn[] = [...columns, { key: "m", label: "M" }];

describe("Feature: Custom cells in the core", () => {
    let table: UauiTestElement & { columns: UauiTableColumn[] };
    let cell: PlainCellElement;

    beforeEach(async () => {
        const screen = await render(html`<uaui-data-table .columns=${columns} .rows=${[{ url: "/a", n: 1 }]}></uaui-data-table>`);
        table = screen.container.querySelector("uaui-data-table") as unknown as typeof table;
        await settle(table);
        cell = table.shadowRoot!.querySelector("uaui-test-plain-cell") as unknown as PlainCellElement;
    });

    describe("Scenario: A context-request gets the context", () => {
        // Given a custom cell inside a uaui-data-table in the core build
        // When  it fires a context-request event for UAUI_TABLE_CONTEXT
        it("its callback receives the table context", () => {
            expect(cell.received[0]).toHaveProperty("columns");
        });
    });

    describe("Scenario: The context gives the columns", () => {
        // Given the cell has the context
        // When  it subscribes to columns
        it("it receives the table's columns", () => {
            let received: UauiTableColumn[] | undefined;
            cell.received[0].columns.subscribe((value) => (received = value));
            expect(received).toEqual(columns);
        });
    });

    describe("Scenario: The cell sees changes", () => {
        // Given the cell subscribed to columns with subscribe set on the request
        // When  the table's columns change
        it("the cell receives the new columns", async () => {
            const seen: UauiTableColumn[][] = [];
            cell.received[0].columns.subscribe((value) => seen.push(value));
            table.columns = moreColumns;
            await settle(table);
            expect(seen[seen.length - 1]).toEqual(moreColumns);
        });
    });

    describe("Scenario: A request for another context goes unanswered", () => {
        it("the callback is not called", () => {
            let called = false;
            const event = new Event("context-request", { bubbles: true, composed: true });
            Object.assign(event, { context: "SomethingElse", callback: () => (called = true), subscribe: false });
            cell.dispatchEvent(event);
            expect(called).toBe(false);
        });
    });

    describe("Scenario: A request without subscribe", () => {
        it("is answered once, with no unsubscribe", () => {
            const args: unknown[][] = [];
            const event = new Event("context-request", { bubbles: true, composed: true });
            Object.assign(event, { context: UAUI_TABLE_CONTEXT, callback: (...a: unknown[]) => args.push(a), subscribe: false });
            cell.dispatchEvent(event);
            expect(args[0].length).toBe(1);
        });
    });
});

/** A host that uses the helpers, the way a core cell does. */
@customElement("uaui-test-helper-cell")
class HelperCellElement extends LitElement {
    columnsSeen: UauiTableColumn[][] = [];
    contexts: (UauiTableContext | undefined)[] = [];
    constructor() {
        super();
        consumeContext(this, UAUI_TABLE_CONTEXT, (context) => {
            this.contexts.push(context);
            observe(this, context?.columns, (columns) => this.columnsSeen.push(columns ?? []), "columns");
        });
    }
}

describe("Feature: the core's consumeContext and observe", () => {
    let table: UauiTestElement & { columns: UauiTableColumn[] };
    let host: HelperCellElement;

    beforeEach(async () => {
        const screen = await render(html`<uaui-data-table .columns=${columns} .rows=${[]}></uaui-data-table>`);
        table = screen.container.querySelector("uaui-data-table") as unknown as typeof table;
        await settle(table);
        host = document.createElement("uaui-test-helper-cell") as HelperCellElement;
    });

    describe("Scenario: a host connects below the table", () => {
        beforeEach(() => table.shadowRoot!.append(host));

        it("consumeContext gives it the table context", () => {
            expect(host.contexts[0]).toHaveProperty("stats");
        });

        it("observe passes the current columns", () => {
            expect(host.columnsSeen[0]).toEqual(columns);
        });

        it("observe passes later changes", async () => {
            table.columns = moreColumns;
            await settle(table);
            expect(host.columnsSeen[host.columnsSeen.length - 1]).toEqual(moreColumns);
        });

        it("a disconnected host gets no more changes", async () => {
            host.remove();
            const before = host.columnsSeen.length;
            table.columns = moreColumns;
            await settle(table);
            expect(host.columnsSeen.length).toBe(before);
        });

        it("a reconnected host asks again", () => {
            host.remove();
            table.shadowRoot!.append(host);
            expect(host.contexts.length).toBe(2);
        });
    });

    describe("Scenario: a host connects with no provider above it", () => {
        it("consumeContext is never called back", () => {
            document.body.append(host);
            host.remove();
            expect(host.contexts).toEqual([]);
        });
    });

    describe("Scenario: observe with the same alias", () => {
        it("replaces the earlier observer", () => {
            const first = new UauiBasicState(1);
            const seen: string[] = [];
            document.body.append(host);
            observe(host, first.asObservable(), (v) => seen.push(`a${v}`), "x");
            observe(host, new UauiBasicState(2).asObservable(), (v) => seen.push(`b${v}`), "x");
            first.setValue(3);
            host.remove();
            expect(seen).toEqual(["a1", "b2"]);
        });
    });

    describe("Scenario: observe outside consumeContext, host moves", () => {
        it("a reconnected host gets the new value", () => {
            const state = new UauiBasicState(1);
            const seen: number[] = [];
            document.body.append(host);
            observe(host, state.asObservable(), (v) => seen.push(v as number), "x");
            host.remove();
            document.body.append(host);
            state.setValue(2);
            host.remove();
            expect(seen[seen.length - 1]).toBe(2);
        });
    });

    describe("Scenario: observe with no source", () => {
        it("calls back with undefined", () => {
            let received: unknown = "unset";
            observe(host, undefined, (v) => (received = v), "x");
            expect(received).toBeUndefined();
        });
    });
});
