// Example only: a made-up store that answers like an API would. A real product calls its own endpoints
// here. Everything is worked out from the date, so the same range always gives the same numbers.
// The shapes follow Commerce's analytics endpoints (total orders and revenue, average order value, cart and abandoned
// cart conversion, repeat customers, applied and popular discounts, top selling products, refund rates, top buyers and
// stock forecast), but carry raw numbers: the page formats them with the editor's culture.
import { uauiDaysIn } from "../../../date-helpers/index.js";
import type { UauiDateRange } from "../../../date-range/types.js";
import type { UauiTableSort } from "../../../table/types.js";
import { wait } from "../fake-latency.js";

/** The store opened on this day: ranges before it have no orders at all. */
export const STORE_OPENED = "2026-01-01";

/**
 * The store's cart cleanup policy deletes carts that never became orders once they are older than this day (90 days
 * before the example's "today", 2026-06-23). Before it only finalized carts remain, so cart conversion reads too high,
 * and the cart conversion endpoint says so with `dateRangeExceedsCartCleanupPolicy`.
 */
export const CART_CLEANUP_CUTOFF = "2026-03-25";

/** One day of the store. Rates are not stored: they are worked out from these counts. */
export type Day = {
    date: string;
    revenue: number;
    orders: number;
    /** Carts created. */
    carts: number;
    /** Carts that reached the checkout. */
    checkouts: number;
    /** Abandoned carts whose customer got a reminder. */
    notifiedCarts: number;
    /** Reminded carts that became an order. */
    recoveredCarts: number;
    customers: number;
    /** Customers who had ordered before. */
    repeatCustomers: number;
    /** Discounts applied to orders, manual and automatic. */
    discountsApplied: number;
    refundedOrders: number;
};

/** The sums of a range's days, plus the rates worked out from them (in %, 0 to 100). */
export type Totals = Omit<Day, "date"> & {
    aov: number;
    conversion: number;
    recovery: number;
    repeatRate: number;
    refundRate: number;
};

/** One product of Commerce's top selling products answer (ProductSalesDataDto): what it is and how many sold. */
/** Rows are per variant: a product with variants has one row per variant, with its own SKU and the same `productReference`. */
export type ProductRow = { productReference: string; productVariantReference?: string; sku: string; name: string; url: string; totalQuantity: number };
export type BuyerRow = { email: string; name: string; orders: number; products: number; spent: number };
/** One discount of Commerce's popular discounts answer (DiscountWithUsageDataDto). Dates are ISO, or missing when open-ended. */
export type DiscountRow = { id: string; name: string; usageCount: number; isActive: boolean; startDate?: string; expiryDate?: string };

/** The answer of Commerce's cart conversion endpoint: the three funnel steps, and whether old carts were cleaned up. */
export type CartConversion = {
    totalCarts: number;
    reachedCheckout: number;
    finalized: number;
    dateRangeExceedsCartCleanupPolicy: boolean;
};

/** Commerce's refund reasons. The page turns them into words. */
export type RefundReason = "itemDefectiveOrDamaged" | "wrongItemSent" | "itemNotAsDescribed" | "itemDidNotArrive" | "customerChangedMind" | "productQualityNotSatisfactory";

/** One product of the refund breakdown. `refundRate` is in % (0 to 100). */
export type RefundRow = { productReference: string; productName: string; sku: string; refundRate: number; topReason?: RefundReason };

/** The answer of Commerce's refund rates endpoint. It has no series over time. */
export type Refunds = { refundRate: number; productBreakdown: RefundRow[] };

/** One product of the stock forecast. Products that didn't sell in the range have no estimate, and the endpoint leaves them out. */
export type StockForecastRow = {
    productReference: string;
    /** Set for a variant, which has its own stock and SKU. */
    productVariantReference?: string;
    sku: string;
    name: string;
    url: string;
    currentStock: number;
    averageDailySales: number;
    estimatedDaysRemaining: number;
};

export type Snapshot = {
    days: Day[];
    totals: Totals;
    products: ProductRow[];
    discounts: DiscountRow[];
    cartConversion: CartConversion;
    refunds: Refunds;
};

export type BuyerQuery = { sort?: UauiTableSort; page: number; pageSize: number; query: string };
export type BuyerPage = { rows: BuyerRow[]; totalRows: number; stats: { spent: { total: number; max: number } } };

const toTime = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/** A number from 0 up to (not including) 1 that depends only on the text. */
function noise(seed: string): number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    return ((h >>> 0) % 10_000) / 10_000;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const rate = (part: number, whole: number) => (whole ? (part / whole) * 100 : 0);

const EMPTY_DAY: Omit<Day, "date"> = {
    revenue: 0,
    orders: 0,
    carts: 0,
    checkouts: 0,
    notifiedCarts: 0,
    recoveredCarts: 0,
    customers: 0,
    repeatCustomers: 0,
    discountsApplied: 0,
    refundedOrders: 0,
};

function dayOf(date: string): Day {
    if (date < STORE_OPENED) return { date, ...EMPTY_DAY };
    const weekday = new Date(toTime(date)).getUTCDay();
    const weekend = weekday === 0 || weekday === 6 ? 0.7 : 1;
    const orders = Math.round((12 + noise(`${date}:orders`) * 14) * weekend);
    const aov = 62 + noise(`${date}:aov`) * 34;
    let carts = Math.round(orders * (2.1 + noise(`${date}:carts`) * 1.2));
    let checkouts = Math.round(orders + (carts - orders) * (0.35 + noise(`${date}:checkouts`) * 0.15));
    const notifiedCarts = Math.round((carts - checkouts) * (0.5 + noise(`${date}:notified`) * 0.2));
    const recoveredCarts = Math.round(notifiedCarts * (0.08 + noise(`${date}:recovered`) * 0.1));
    // The cleanup policy has deleted the carts that never became orders: only finalized carts are left.
    if (date < CART_CLEANUP_CUTOFF) carts = checkouts = orders;
    const customers = Math.round(orders * (0.85 + noise(`${date}:customers`) * 0.1));
    return {
        date,
        orders,
        revenue: round2(orders * aov),
        carts,
        checkouts,
        notifiedCarts,
        recoveredCarts,
        customers,
        repeatCustomers: Math.round(customers * (0.18 + noise(`${date}:repeat`) * 0.12)),
        discountsApplied: Math.round(orders * (0.3 + noise(`${date}:discounts`) * 0.2)),
        refundedOrders: Math.round(orders * noise(`${date}:refunds`) * 0.08),
    };
}

export function totalsOf(days: Day[]): Totals {
    const sum = (key: keyof Omit<Day, "date">) => days.reduce((total, d) => total + d[key], 0);
    const counts = Object.fromEntries((Object.keys(EMPTY_DAY) as (keyof Omit<Day, "date">)[]).map((key) => [key, sum(key)])) as Omit<Day, "date">;
    counts.revenue = round2(counts.revenue);
    return {
        ...counts,
        aov: counts.orders ? round2(counts.revenue / counts.orders) : 0,
        conversion: rate(counts.orders, counts.carts),
        recovery: rate(counts.recoveredCarts, counts.notifiedCarts),
        repeatRate: rate(counts.repeatCustomers, counts.customers),
        refundRate: rate(counts.refundedOrders, counts.orders),
    };
}

// One entry per variant (or per product without variants). `product` is the parent's SKU when the entry is a variant.
// Stock is what is in the warehouse today. Below LOW_STOCK_THRESHOLD: both hoodie variants, the mug, bottle, beanie,
// notebook, socks and candle (which run out soon), the poster (over a month it sells so slowly it outlasts the
// forecast window) and the gift wrap (doesn't sell, so no estimate).
const products: { sku: string; product?: string; name: string; weight: number; refunds: number; stock: number }[] = [
    { sku: "TS-001", name: "Organic cotton tee", weight: 0.17, refunds: 0.05, stock: 214 },
    { sku: "HD-014-M", product: "HD-014", name: "Fleece hoodie, M", weight: 0.13, refunds: 0.07, stock: 4 },
    { sku: "HD-014-L", product: "HD-014", name: "Fleece hoodie, L", weight: 0.11, refunds: 0.05, stock: 6 },
    { sku: "MG-203", name: "Enamel camp mug", weight: 0.12, refunds: 0.03, stock: 0 },
    { sku: "BT-310", name: "Insulated water bottle", weight: 0.1, refunds: 0.04, stock: 8 },
    { sku: "CP-055", name: "Wool beanie", weight: 0.08, refunds: 0.02, stock: 7 },
    { sku: "NB-120", name: "Dotted notebook", weight: 0.07, refunds: 0, stock: 5 },
    { sku: "SK-418", name: "Merino hiking socks", weight: 0.06, refunds: 0.06, stock: 6 },
    { sku: "CD-090", name: "Soy candle", weight: 0.05, refunds: 0.09, stock: 9 },
    { sku: "PS-006", name: "Poster print A2", weight: 0.003, refunds: 0.08, stock: 5 },
    { sku: "GW-500", name: "Gift wrap", weight: 0, refunds: 0, stock: 3 },
];

const refundReasons: RefundReason[] = [
    "itemDefectiveOrDamaged",
    "wrongItemSent",
    "itemNotAsDescribed",
    "itemDidNotArrive",
    "customerChangedMind",
    "productQualityNotSatisfactory",
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

const discounts: (Omit<DiscountRow, "usageCount"> & { weight: number })[] = [
    { id: "6f1c2a40-0001-4c1e-9a10-000000000001", name: "Welcome offer", isActive: true, weight: 0.3 },
    { id: "6f1c2a40-0002-4c1e-9a10-000000000002", name: "Summer sale", isActive: true, startDate: "2026-06-01", expiryDate: "2026-08-31", weight: 0.24 },
    { id: "6f1c2a40-0003-4c1e-9a10-000000000003", name: "Free shipping over 50", isActive: true, startDate: "2026-01-01", weight: 0.2 },
    { id: "6f1c2a40-0004-4c1e-9a10-000000000004", name: "Loyalty reward", isActive: true, expiryDate: "2026-12-31", weight: 0.12 },
    { id: "6f1c2a40-0005-4c1e-9a10-000000000005", name: "Spring bundle saver", isActive: false, startDate: "2026-03-01", expiryDate: "2026-05-31", weight: 0.08 },
];

const wobble = (range: UauiDateRange, id: string) => 0.8 + noise(`${range.from}:${range.to}:${id}`) * 0.4;
const productUrl = (sku: string) => `https://shop.example.com/p/${sku.toLowerCase()}`;
/** The references Commerce returns for a product or variant: the parent product's, plus the variant's when it is one. */
const referencesOf = (p: { sku: string; product?: string }) => ({
    productReference: `prod-${(p.product ?? p.sku).toLowerCase()}`,
    ...(p.product ? { productVariantReference: `var-${p.sku.toLowerCase()}` } : {}),
});

function productsFor(range: UauiDateRange, totals: Totals): ProductRow[] {
    return products
        .map((p) => {
            const totalQuantity = Math.round(totals.orders * 1.8 * p.weight * wobble(range, p.sku));
            return { ...referencesOf(p), sku: p.sku, name: p.name, url: productUrl(p.product ?? p.sku), totalQuantity };
        })
        .filter((p) => p.totalQuantity > 0)
        .sort((a, b) => b.totalQuantity - a.totalQuantity);
}

function discountsFor(range: UauiDateRange, totals: Totals): DiscountRow[] {
    return discounts
        .map(({ weight, ...d }) => ({ ...d, usageCount: Math.round(totals.orders * 0.5 * weight * wobble(range, d.id)) }))
        .filter((d) => d.usageCount > 0)
        .sort((a, b) => b.usageCount - a.usageCount);
}

function cartConversionFor(range: UauiDateRange, totals: Totals): CartConversion {
    return {
        totalCarts: totals.carts,
        reachedCheckout: totals.checkouts,
        finalized: totals.orders,
        dateRangeExceedsCartCleanupPolicy: range.from < CART_CLEANUP_CUTOFF,
    };
}

/** Refund rates by product: only products with refunds, highest rate first, as the endpoint answers. */
function refundsFor(range: UauiDateRange, totals: Totals, sold: ProductRow[]): Refunds {
    const productBreakdown = sold
        .map((row): RefundRow | undefined => {
            const product = products.find((p) => p.sku === row.sku)!;
            const refunded = Math.round(row.totalQuantity * product.refunds * wobble(range, `${row.sku}:refunds`));
            if (!refunded) return undefined;
            const reason = refundReasons[Math.floor(noise(`${range.from}:${row.sku}:reason`) * refundReasons.length)];
            return { productReference: row.productReference, productName: row.name, sku: row.sku, refundRate: rate(refunded, row.totalQuantity), topReason: reason };
        })
        .filter((row): row is RefundRow => row !== undefined)
        .sort((a, b) => b.refundRate - a.refundRate);
    return { refundRate: totals.refundRate, productBreakdown };
}

function buyersFor(range: UauiDateRange): BuyerRow[] {
    const totals = totalsOf(uauiDaysIn(range).map(dayOf));
    return buyers
        .map(([name, email, weight]) => {
            const orders = Math.round(totals.orders * weight * 0.4 * wobble(range, email));
            return {
                email,
                name,
                orders,
                products: Math.round(orders * (1.5 + noise(`${email}:products`) * 2)),
                spent: round2(orders * totals.aov * (0.9 + noise(email) * 0.3)),
            };
        })
        .filter((b) => b.orders > 0)
        .sort((a, b) => b.spent - a.spent);
}

/** How a call to the fake API behaves: how long it takes, and whether it fails (rejects) like a server error would. */
export type FakeApiOptions = { latencyMs?: number; fail?: boolean };

/** Waits like a request would, then rejects when the call is set to fail. */
async function respond({ latencyMs = 0, fail = false }: FakeApiOptions, what: string): Promise<void> {
    await wait(latencyMs);
    if (fail) throw new Error(`The ${what} request failed.`);
}

/** The KPI totals, the daily points, the small tables, the cart funnel and the refund breakdown for one range. */
export async function loadSnapshot(range: UauiDateRange, options: FakeApiOptions = {}): Promise<Snapshot> {
    await respond(options, "analytics");
    const days = uauiDaysIn(range).map(dayOf);
    const totals = totalsOf(days);
    const sold = productsFor(range, totals);
    return {
        days,
        totals,
        products: sold,
        discounts: discountsFor(range, totals),
        cartConversion: cartConversionFor(range, totals),
        refunds: refundsFor(range, totals, sold),
    };
}

/** Top buyers, one page at a time: the server searches, sorts and pages, like a real endpoint would. */
export async function loadBuyers(range: UauiDateRange, query: BuyerQuery, options: FakeApiOptions = {}): Promise<BuyerPage> {
    await respond(options, "top buyers");
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
export async function loadBuyerCompare(range: UauiDateRange, options: FakeApiOptions = {}): Promise<BuyerRow[]> {
    await respond(options, "top buyers");
    return buyersFor(range);
}

/** Commerce's `Analytics:Stock:LowStockThreshold` setting (default 10): only products with less stock than this are forecast. */
export const LOW_STOCK_THRESHOLD = 10;

/** Commerce's `Analytics:Stock:ForecastWindowMultiplier` setting (default 1.5): the forecast looks this many ranges ahead. */
export const FORECAST_WINDOW_MULTIPLIER = 1.5;

/**
 * The stock forecast, as Commerce works it out: for each product with less stock than the low stock threshold, the
 * average daily sales over the chosen range and how many whole days the stock lasts at that pace. Only products that
 * run out within ceil(range days × the forecast window multiplier) are returned, soonest first. A product that didn't
 * sell in the range has no estimate, so it is left out. 0 days means out of stock. It has no compare.
 */
export async function loadStockForecast(range: UauiDateRange, options: FakeApiOptions = {}): Promise<StockForecastRow[]> {
    await respond(options, "stock forecast");
    const days = uauiDaysIn(range);
    const sold = productsFor(range, totalsOf(days.map(dayOf)));
    const horizon = Math.ceil(days.length * FORECAST_WINDOW_MULTIPLIER);
    return products
        .filter((p) => p.stock < LOW_STOCK_THRESHOLD)
        .flatMap((p): StockForecastRow[] => {
            const quantity = sold.find((s) => s.sku === p.sku)?.totalQuantity ?? 0;
            if (!quantity) return [];
            // Like Commerce: divide by the totals, not the rounded per-day rate.
            const estimatedDaysRemaining = Math.floor((p.stock * days.length) / quantity);
            if (estimatedDaysRemaining > horizon) return [];
            return [
                {
                    ...referencesOf(p),
                    sku: p.sku,
                    name: p.name,
                    url: productUrl(p.product ?? p.sku),
                    currentStock: p.stock,
                    averageDailySales: round2(quantity / days.length),
                    estimatedDaysRemaining,
                },
            ];
        })
        .sort((a, b) => a.estimatedDaysRemaining - b.estimatedDaysRemaining);
}
