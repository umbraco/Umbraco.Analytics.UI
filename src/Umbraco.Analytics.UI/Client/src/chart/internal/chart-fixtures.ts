// Sample data for the chart stories: 30 days from 25 May 2026 with a spike on 11 Jun, like the Phase 1 design.
import { uauiTimeBuckets } from "../../date-helpers/index.js";
import type { UauiMarker, UauiSeries } from "../types.js";

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

const toSeries = (id: string, label: string, values: number[], dayOf = dayAfter25May): UauiSeries => ({
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

/** The daily pageviews of a range added up into weeks that start on Sunday, each point on the Sunday its week starts. */
const sundayWeeksOf = (range: { from: string; to: string }, values: number[], valueDay: (offset: number) => string): UauiSeries => {
    const valueOn = new Map(values.map((value, i) => [valueDay(i), value]));
    return {
        id: "pageviews",
        label: "Pageviews",
        points: uauiTimeBuckets(range, "week", { weekStart: 7 }).map(({ start, days }) => ({ date: start, value: days.reduce((sum, day) => sum + (valueOn.get(day) ?? 0), 0) })),
    };
};

/** Pageviews for 25 May to 23 Jun 2026 as weeks starting on Sunday, for the week start story. */
export const sundayWeeks = sundayWeeksOf({ from: "2026-05-25", to: "2026-06-23" }, pageviewValues, dayAfter25May);
/** The 30 days before, as Sunday weeks: the compare series of the week start story. */
export const sundayWeeksPrevious = sundayWeeksOf({ from: "2026-04-25", to: "2026-05-24" }, previousPageviewValues, dayAfter25Apr);

/** Pageviews for each local hour of 5 Nov 2026, quiet at night and busy in the afternoon, for the hourly story. */
export const pageviewsByHour: UauiSeries = {
    id: "pageviews",
    label: "Pageviews",
    points: uauiTimeBuckets({ from: "2026-11-05", to: "2026-11-05" }, "hour").map(({ start }, hour) => ({
        date: start,
        value: Math.round(40 + 160 * Math.sin((Math.PI * Math.max(0, hour - 5)) / 18) ** 2),
    })),
};

/** Small daily counts for the bar stories (25 May to 23 Jun 2026), like the Phase 1 visitors chart. */
const returningValues = [1, 0, 1, 0, 1, 0, 0, 2, 1, 0, 1, 0, 0, 2, 0, 1, 1, 0, 0, 2, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1];
const newVisitorValues = [0, 1, 1, 2, 0, 1, 1, 0, 1, 4, 1, 0, 1, 0, 0, 1, 1, 2, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1];
/** The 30 days before, as one total per day (the compare series of both parts added up). */
const previousVisitorValues = [1, 1, 0, 1, 1, 1, 2, 1, 1, 1, 2, 2, 1, 1, 0, 1, 1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 0, 1, 1, 1];

export const returningVisitors: UauiSeries = { ...toSeries("returning", "Returning visitor", returningValues), color: 1 };
export const newVisitors: UauiSeries = { ...toSeries("new", "New visitor", newVisitorValues), color: 3 };
/** Visitors for 25 Apr to 24 May 2026: the compare series of the stacked bars. */
export const previousVisitors = toSeries("visitors", "Visitors", previousVisitorValues, dayAfter25Apr);

/** Workflow-like approval activity (25 May to 23 Jun 2026), each status in its status colour (T57). */
const approvedValues = [4, 6, 5, 7, 3, 1, 0, 5, 6, 8, 7, 5, 1, 0, 6, 7, 9, 12, 8, 6, 1, 0, 5, 6, 7, 6, 4, 1, 0, 6];
export const approved: UauiSeries = { ...toSeries("approved", "Approved", approvedValues), color: "positive" };
export const pending: UauiSeries = { ...toSeries("pending", "Pending", approvedValues.map((v) => Math.round(v * 0.4))), color: "warning" };
export const errored: UauiSeries = { ...toSeries("errored", "Errored", approvedValues.map((v, i) => (i % 6 === 2 ? Math.ceil(v / 3) : 0))), color: "danger" };
export const cancelled: UauiSeries = { ...toSeries("cancelled", "Cancelled", approvedValues.map((v, i) => (i % 4 === 1 ? 1 : 0))), color: "default" };
/** Errors for 25 Apr to 24 May 2026: the compare series of `errored`. */
export const erroredPrevious = toSeries("errored", "Errored", approvedValues.map((v, i) => (i % 5 === 1 ? Math.ceil(v / 2) : 0)), dayAfter25Apr);

/** "Today" for the Workflow stories: 28 days after 25 May. Their series run 7 days past it. */
export const workflowToday = "2026-06-22";

/** 28 days back to `workflowToday` and 7 ahead: the values given, then zeros, as nothing has happened yet. */
const workflowSeries = (id: string, label: string, values: number[]): UauiSeries =>
    toSeries(id, label, Array.from({ length: 36 }, (_, i) => (i <= 28 ? (values[i] ?? 0) : 0)));

/**
 * Workflow's approval activity: approved, cancelled and errored as daily bars in their status colours, and pending
 * (workflows still waiting, a running total) as a line over them.
 */
export const workflowActivity: UauiSeries[] = [
    { ...workflowSeries("approved", "Approved", approvedValues), color: "positive" },
    { ...workflowSeries("cancelled", "Cancelled", approvedValues.map((v, i) => (i % 4 === 1 ? 1 : 0))), color: "default" },
    { ...workflowSeries("errored", "Errored", approvedValues.map((v, i) => (i % 6 === 2 ? Math.ceil(v / 3) : 0))), color: "danger" },
    {
        ...workflowSeries("pending", "Pending", approvedValues.map((v, i) => 8 + (i % 7) * 2 - (i % 5))),
        color: "warning",
        kind: "line",
    },
];

/** Counts that span widely, for the log axis: hundreds of pageviews a day beside a few errors (and days with none). */
export const wideRange: UauiSeries[] = [
    toSeries("pageviews", "Pageviews", pageviewValues.map((v) => v * 12)),
    { ...toSeries("errors", "Errors", approvedValues.map((v, i) => (i % 3 === 0 ? 0 : Math.ceil(v / 4)))), color: "danger" },
];

/** Events inside the 25 May to 23 Jun range of the series above. Two share 18 Jun, so that dot carries a count. */
export const markers: UauiMarker[] = [
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

/** Forms-like source pages, largest first, with their share of a form's entries (T59). */
const sourcePageNames: [string, number][] = [
    ["Summer conference", 0.22],
    ["Events", 0.16],
    ["Workshop: Getting started", 0.13],
    ["Home", 0.11],
    ["Newsletter, June", 0.09],
    ["Blog: Spring recap", 0.08],
    ["Contact", 0.06],
    ["Pricing", 0.05],
    ["About us", 0.04],
    ["Careers", 0.035],
    ["Partners", 0.025],
];

/** The day (31 May) the made-up form took no entries at all: the share view shows nothing there. */
export const quietDay = "2026-05-31";

/**
 * Entries per source page (25 May to 23 Jun 2026): one series per page, 11 in all, so the palette's eight slots run
 * out, the legend folds and the tooltip lists the largest. No page has an entry on `quietDay`.
 */
export const sourcePages: UauiSeries[] = sourcePageNames.map(([label, weight], p) =>
    toSeries(
        `page-${p + 1}`,
        label,
        pageviewValues.map((v, i) => (dayAfter25May(i) === quietDay ? 0 : Math.round(v * weight * (0.6 + ((i * 7 + p * 13) % 10) / 12)))),
    ),
);

/** The five largest source pages: few enough for every one to keep its own colour and legend entry. */
export const topSourcePages: UauiSeries[] = sourcePages.slice(0, 5);
