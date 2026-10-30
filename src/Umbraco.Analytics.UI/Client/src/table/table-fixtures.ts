// Shared rows and columns for the uax-data-table specs.
import { UAX_TABLE_CELL } from "./cells/cell-names.js";
export const pageColumns = [
    { key: "url", label: "Page URL", elementName: UAX_TABLE_CELL.link, hrefKey: "url" },
    { key: "pageviews", label: "Pageviews", elementName: UAX_TABLE_CELL.share, sortable: true, sortAs: "number" },
    { key: "sessions", label: "Page sessions", elementName: UAX_TABLE_CELL.share, sortable: true, sortAs: "number" },
];

export const pageRows = [
    { url: "https://example.com/", pageviews: 210, sessions: 32 },
    { url: "https://example.com/contact/", pageviews: 62, sessions: 21 },
];

/** `count` rows named "Page 1"…"Page <count>", for paging. */
export const manyRows = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ name: `Page ${i + 1}`, views: count - i }));

export const nameColumns = [
    { key: "name", label: "Name" },
    { key: "views", label: "Views", elementName: UAX_TABLE_CELL.number, sortable: true, sortAs: "number", align: "end" },
];
