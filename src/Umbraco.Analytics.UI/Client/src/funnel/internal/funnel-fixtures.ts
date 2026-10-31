// Made-up steps for stories and tests.
import type { UauiFunnelStep } from "../types.js";

/** A shop visit, from landing to order (Engage). */
export const visitSteps: UauiFunnelStep[] = [
    { id: "visitors", label: "Visitors", value: 678 },
    { id: "viewed", label: "Viewed a product", value: 304 },
    { id: "cart", label: "Added to cart", value: 64 },
    { id: "ordered", label: "Placed an order", value: 26 },
];

export const visitStepsPrevious: UauiFunnelStep[] = [
    { id: "visitors", label: "Visitors", value: 612 },
    { id: "viewed", label: "Viewed a product", value: 281 },
    { id: "cart", label: "Added to cart", value: 70 },
    { id: "ordered", label: "Placed an order", value: 22 },
];

/** Carts to orders (Commerce). */
export const cartSteps: UauiFunnelStep[] = [
    { id: "carts", label: "Carts created", value: 1240 },
    { id: "checkout", label: "Reached checkout", value: 532 },
    { id: "orders", label: "Orders placed", value: 318 },
];

export const cartStepsPrevious: UauiFunnelStep[] = [
    { id: "carts", label: "Carts created", value: 1105 },
    { id: "checkout", label: "Reached checkout", value: 498 },
    { id: "orders", label: "Orders placed", value: 301 },
];

export const currentRangeLabel = "Jun 1, 2026 to Jun 30, 2026";
export const compareRangeLabel = "May 2, 2026 to May 31, 2026";
