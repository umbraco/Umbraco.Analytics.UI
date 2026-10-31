/** A tooltip's top left inside the plot, in CSS pixels. Without `top` the tooltip keeps the one its stylesheet gives it. */
export interface UauiTooltipPosition {
    left: number;
    top?: number;
}

/** A tooltip element that draws its content in a later update, so its size isn't known until then. */
export interface UauiPlacedTooltip extends HTMLElement {
    updateComplete: Promise<unknown>;
}

/** `value` moved the least that keeps a box of `size` inside `0..limit`; a box bigger than `limit` sits at 0. */
export function clampInside(value: number, size: number, limit: number): number {
    return Math.min(Math.max(value, 0), Math.max(limit - size, 0));
}

/**
 * Places a plot tooltip and shows it. A tooltip is rendered hidden because its size depends on its content, which it
 * draws a microtask after the render that added it: wait for that, then ask `position` where it goes for that size.
 * Nothing is placed when `position` returns nothing (what it pointed at has gone) or the tooltip has left the DOM.
 */
export async function placeTooltip(
    tip: UauiPlacedTooltip,
    position: (size: { width: number; height: number }) => UauiTooltipPosition | undefined,
): Promise<void> {
    await tip.updateComplete;
    if (!tip.isConnected) return;
    const at = position({ width: tip.offsetWidth, height: tip.offsetHeight });
    if (!at) return;
    tip.style.left = `${at.left}px`;
    if (at.top !== undefined) tip.style.top = `${at.top}px`;
    tip.style.visibility = "visible";
}
