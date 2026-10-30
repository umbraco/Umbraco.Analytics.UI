// Shared rows and columns for the uan-data-table specs.
export const pageColumns = [
    { key: "url", label: "Page URL", type: "link", hrefKey: "url" },
    { key: "pageviews", label: "Pageviews", type: "share", sortable: true },
    { key: "sessions", label: "Page sessions", type: "share", sortable: true },
];

export const pageRows = [
    { url: "https://example.com/", pageviews: 210, sessions: 32 },
    { url: "https://example.com/contact/", pageviews: 62, sessions: 21 },
];

/** `count` rows named "Page 1"…"Page <count>", for paging. */
export const manyRows = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ name: `Page ${i + 1}`, views: count - i }));

export const nameColumns = [
    { key: "name", label: "Name", type: "text" },
    { key: "views", label: "Views", type: "number", sortable: true },
];
