// Example only: a made-up store that answers like an API would. A real product calls its own endpoints
// here. Everything is worked out from the date, so the same range always gives the same numbers.
import type { UaxDateRange } from "../../../date-range/types.js";
import type { UaxTableSort } from "../../../table/types.js";
import { wait } from "../fake-latency.js";

/** The store opened on this day: ranges before it have no orders at all. */
export const STORE_OPENED = "2026-01-01";

export type Totals = { revenue: number; orders: number; aov: number; carts: number; conversion: number };
export type Day = { date: string; revenue: number; orders: number; carts: number };
export type ProductRow = { sku: string; name: string; url: string; units: number; revenue: number };
export type BuyerRow = { email: string; name: string; orders: number; spent: number };
export type DiscountRow = { code: string; name: string; uses: number; given: number };

export type Snapshot = {
    days: Day[];
    totals: Totals;
    products: ProductRow[];
    discounts: DiscountRow[];
};

export type BuyerQuery = { sort?: UaxTableSort; page: number; pageSize: number; query: string };
export type BuyerPage = { rows: BuyerRow[]; totalRows: number; stats: { spent: { total: number; max: number } } };

const DAY_MS = 86_400_000;
const toTime = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const toIso = (time: number) => new Date(time).toISOString().slice(0, 10);

function datesIn(range: Pick<UaxDateRange, "from" | "to">): string[] {
    const dates: string[] = [];
    for (let t = toTime(range.from); t <= toTime(range.to); t += DAY_MS) dates.push(toIso(t));
    return dates;
}

/** A number from 0 up to (not including) 1 that depends only on the text. */
function noise(seed: string): number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    return ((h >>> 0) % 10_000) / 10_000;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function dayOf(date: string): Day {
    if (date < STORE_OPENED) return { date, revenue: 0, orders: 0, carts: 0 };
    const weekday = new Date(toTime(date)).getUTCDay();
    const weekend = weekday === 0 || weekday === 6 ? 0.7 : 1;
    const orders = Math.round((12 + noise(`${date}:orders`) * 14) * weekend);
    const aov = 62 + noise(`${date}:aov`) * 34;
    const carts = Math.round(orders * (2.1 + noise(`${date}:carts`) * 1.2));
    return { date, orders, carts, revenue: round2(orders * aov) };
}

export function totalsOf(days: Day[]): Totals {
    const revenue = days.reduce((sum, d) => sum + d.revenue, 0);
    const orders = days.reduce((sum, d) => sum + d.orders, 0);
    const carts = days.reduce((sum, d) => sum + d.carts, 0);
    return {
        revenue: round2(revenue),
        orders,
        carts,
        aov: orders ? round2(revenue / orders) : 0,
        conversion: carts ? (orders / carts) * 100 : 0,
    };
}

const products = [
    { sku: "TS-001", name: "Organic cotton tee", price: 29, weight: 0.17 },
    { sku: "HD-014", name: "Fleece hoodie", price: 64, weight: 0.13 },
    { sku: "MG-203", name: "Enamel camp mug", price: 14, weight: 0.12 },
    { sku: "TB-077", name: "Canvas tote bag", price: 19, weight: 0.11 },
    { sku: "BT-310", name: "Insulated water bottle", price: 32, weight: 0.1 },
    { sku: "CP-055", name: "Wool beanie", price: 24, weight: 0.08 },
    { sku: "NB-120", name: "Dotted notebook", price: 12, weight: 0.07 },
    { sku: "SK-418", name: "Merino hiking socks", price: 18, weight: 0.06 },
    { sku: "CD-090", name: "Soy candle", price: 21, weight: 0.05 },
    { sku: "PS-006", name: "Poster print A2", price: 35, weight: 0.04 },
];

const buyers = [
    ["Ada Example", "ada@example.com", 0.1],
    ["Bo Testsen", "bo.testsen@example.com", 0.09],
    ["Cleo Sample", "cleo@example.com", 0.085],
    ["Dev Demo", "dev.demo@example.com", 0.08],
    ["Elin Fiktiv", "elin@example.com", 0.07],
    ["Finn Placeholder", "finn@example.com", 0.065],
    ["Gus Mockley", "gus@example.com", 0.06],
    ["Hana Madeup", "hana.madeup@example.com", 0.055],
    ["Ivo Fakeman", "ivo@example.com", 0.05],
    ["Jo Sampleton", "jo@example.com", 0.045],
    ["Kai Dummy", "kai.dummy@example.com", 0.04],
    ["Lou Testington", "lou@example.com", 0.035],
    ["Mia Imaginary", "mia@example.com", 0.03],
    ["Nils Pretend", "nils@example.com", 0.025],
] as const;

const discounts = [
    { code: "WELCOME10", name: "Welcome offer", weight: 0.3, value: 6 },
    { code: "SUMMER20", name: "Summer sale", weight: 0.24, value: 11 },
    { code: "FREESHIP", name: "Free shipping over 50", weight: 0.2, value: 5 },
    { code: "LOYAL15", name: "Loyalty reward", weight: 0.12, value: 9 },
    { code: "BUNDLE5", name: "Bundle saver", weight: 0.08, value: 5 },
];

const wobble = (range: UaxDateRange, id: string) => 0.8 + noise(`${range.from}:${range.to}:${id}`) * 0.4;

function productsFor(range: UaxDateRange, totals: Totals): ProductRow[] {
    return products
        .map((p) => {
            const units = Math.round(totals.orders * 1.8 * p.weight * wobble(range, p.sku));
            return { sku: p.sku, name: p.name, url: `https://shop.example.com/p/${p.sku.toLowerCase()}`, units, revenue: units * p.price };
        })
        .filter((p) => p.units > 0)
        .sort((a, b) => b.units - a.units);
}

function discountsFor(range: UaxDateRange, totals: Totals): DiscountRow[] {
    return discounts
        .map((d) => {
            const uses = Math.round(totals.orders * 0.5 * d.weight * wobble(range, d.code));
            return { code: d.code, name: d.name, uses, given: round2(uses * d.value) };
        })
        .filter((d) => d.uses > 0)
        .sort((a, b) => b.uses - a.uses);
}

function buyersFor(range: UaxDateRange): BuyerRow[] {
    const totals = totalsOf(datesIn(range).map(dayOf));
    return buyers
        .map(([name, email, weight]) => {
            const orders = Math.round(totals.orders * weight * 0.4 * wobble(range, email));
            return { email, name, orders, spent: round2(orders * totals.aov * (0.9 + noise(email) * 0.3)) };
        })
        .filter((b) => b.orders > 0)
        .sort((a, b) => b.spent - a.spent);
}

/** The KPI totals, the daily points and the two small tables for one range. */
export async function loadSnapshot(range: UaxDateRange, latencyMs = 0): Promise<Snapshot> {
    await wait(latencyMs);
    const days = datesIn(range).map(dayOf);
    const totals = totalsOf(days);
    return { days, totals, products: productsFor(range, totals), discounts: discountsFor(range, totals) };
}

/** Top buyers, one page at a time: the server searches, sorts and pages, like a real endpoint would. */
export async function loadBuyers(range: UaxDateRange, query: BuyerQuery, latencyMs = 0): Promise<BuyerPage> {
    await wait(latencyMs);
    const all = buyersFor(range);
    const needle = query.query.trim().toLowerCase();
    const found = needle ? all.filter((b) => `${b.name} ${b.email}`.toLowerCase().includes(needle)) : all;
    const sorted = [...found];
    if (query.sort) {
        const { key, direction } = query.sort;
        const sign = direction === "asc" ? 1 : -1;
        sorted.sort((a, b) => {
            const x = a[key as keyof BuyerRow];
            const y = b[key as keyof BuyerRow];
            return sign * (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y)));
        });
    }
    const start = (query.page - 1) * query.pageSize;
    return {
        rows: sorted.slice(start, start + query.pageSize),
        totalRows: sorted.length,
        stats: { spent: { total: found.reduce((sum, b) => sum + b.spent, 0), max: found.reduce((max, b) => Math.max(max, b.spent), 0) } },
    };
}

/** Last period's buyers, for the compare badges. Matched to the page's rows by email. */
export async function loadBuyerCompare(range: UaxDateRange, latencyMs = 0): Promise<BuyerRow[]> {
    await wait(latencyMs);
    return buyersFor(range);
}
