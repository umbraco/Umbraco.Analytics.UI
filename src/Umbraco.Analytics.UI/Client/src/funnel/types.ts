/** One step of a funnel, such as "Added to cart". */
export type UauiFunnelStep = {
    /** Identifies the step. Must be unique within `steps` (and within `compare-steps`): a compare step is matched to its current step by `id`, and the funnel keys its rows by it. */
    id: string;
    /** Shown beside the bar, in the tooltip and in the screen reader table. */
    label: string;
    /** How many reached the step. A negative or non-finite value counts as 0. */
    value: number;
};
