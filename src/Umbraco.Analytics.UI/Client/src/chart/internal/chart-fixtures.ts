// Sample data for the chart stories: 30 days from 25 May 2026 with a spike on 11 Jun, like the Phase 1 design.
import type { UaxMarker, UaxSeries } from "../types.js";

const pageviewValues = [
    62, 70, 87, 95, 104, 58, 44, 73, 83, 113, 120, 128, 66, 51, 80, 98, 142, 280, 132, 92, 60, 76, 98, 124, 116, 92, 64, 50, 78, 118,
];

/** The 30 days before the pageview values above, for the compare stories: a little lower, with a smaller spike. */
const previousPageviewValues = [
    46, 58, 66, 74, 98, 52, 40, 70, 78, 100, 108, 112, 70, 44, 82, 90, 122, 248, 120, 96, 54, 70, 104, 110, 96, 104, 60, 48, 86, 104,
];

const dayAfter25May = (offset: number) => {
    const d = new Date(Date.UTC(2026, 4, 25 + offset));
    return d.toISOString().slice(0, 10);
};

const dayAfter25Apr = (offset: number) => {
    const d = new Date(Date.UTC(2026, 3, 25 + offset));
    return d.toISOString().slice(0, 10);
};

const toSeries = (id: string, label: string, values: number[], dayOf = dayAfter25May): UaxSeries => ({
    id,
    label,
    points: values.map((value, i) => ({ date: dayOf(i), value })),
});

export const pageviews = toSeries("pageviews", "Pageviews", pageviewValues);

export const sessions = toSeries(
    "sessions",
    "Sessions",
    pageviewValues.map((v) => Math.round(v * 0.46)),
);

export const revenue = toSeries(
    "revenue",
    "Revenue",
    pageviewValues.map((v) => Math.round(v * 18.4 * 100) / 100),
);

/** Pageviews for 25 Apr to 24 May 2026: the compare series of `pageviews`, matched by id. */
export const pageviewsPrevious = toSeries("pageviews", "Pageviews", previousPageviewValues, dayAfter25Apr);

/** Sessions for 25 Apr to 24 May 2026: the compare series of `sessions`. */
export const sessionsPrevious = toSeries(
    "sessions",
    "Sessions",
    previousPageviewValues.map((v) => Math.round(v * 0.5)),
    dayAfter25Apr,
);

export const compareRangeLabel = "Apr 25, 2026 – May 24, 2026";

/** Small daily counts for the bar stories (25 May to 23 Jun 2026), like the Phase 1 visitors chart. */
const returningValues = [1, 0, 1, 0, 1, 0, 0, 2, 1, 0, 1, 0, 0, 2, 0, 1, 1, 0, 0, 2, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1];
const newVisitorValues = [0, 1, 1, 2, 0, 1, 1, 0, 1, 4, 1, 0, 1, 0, 0, 1, 1, 2, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1];
/** The 30 days before, as one total per day (the compare series of both parts added up). */
const previousVisitorValues = [1, 1, 0, 1, 1, 1, 2, 1, 1, 1, 2, 2, 1, 1, 0, 1, 1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 0, 1, 1, 1];

export const returningVisitors: UaxSeries = { ...toSeries("returning", "Returning visitor", returningValues), color: 1 };
export const newVisitors: UaxSeries = { ...toSeries("new", "New visitor", newVisitorValues), color: 3 };
/** Visitors for 25 Apr to 24 May 2026: the compare series of the stacked bars. */
export const previousVisitors = toSeries("visitors", "Visitors", previousVisitorValues, dayAfter25Apr);

/** Events inside the 25 May to 23 Jun range of the series above. Two share 18 Jun, so that dot carries a count. */
export const markers: UaxMarker[] = [
    { id: "m1", date: "2026-05-29", title: "Newsletter sent", description: "May issue to 12,400 subscribers." },
    { id: "m2", date: "2026-06-03", title: "Blog post published", description: "How we cut page load by 40%." },
    {
        id: "m3",
        date: "2026-06-11",
        title: "Spring product launch",
        description: "Homepage hero + paid push went live. Traffic spiked across all channels.",
    },
    { id: "m4", date: "2026-06-14", title: "Paid push ended" },
    { id: "m5", date: "2026-06-18", title: "Partner webinar", description: "Live session with 340 attendees." },
    { id: "m6", date: "2026-06-18", title: "Webinar recording shared" },
    { id: "m7", date: "2026-06-22", title: "Pricing page update", description: "New plan comparison table." },
];
