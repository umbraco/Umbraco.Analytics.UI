// Sample data for the chart stories: 30 days from 25 May 2026 with a spike on 11 Jun, like the Phase 1 design.
import type { UaxSeries } from "../types.js";

const pageviewValues = [
    62, 70, 87, 95, 104, 58, 44, 73, 83, 113, 120, 128, 66, 51, 80, 98, 142, 280, 132, 92, 60, 76, 98, 124, 116, 92, 64, 50, 78, 118,
];

const dayAfter25May = (offset: number) => {
    const d = new Date(Date.UTC(2026, 4, 25 + offset));
    return d.toISOString().slice(0, 10);
};

const toSeries = (id: string, label: string, values: number[]): UaxSeries => ({
    id,
    label,
    points: values.map((value, i) => ({ date: dayAfter25May(i), value })),
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
