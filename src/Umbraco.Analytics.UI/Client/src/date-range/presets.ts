import type { UaxDatePreset } from "./types.js";

/** The presets offered when a product passes none. */
export const defaultPresets = (): UaxDatePreset[] => [
    { id: "last-7-days" },
    { id: "last-30-days" },
    { id: "last-month" },
    { id: "last-year" },
    { id: "custom" },
];
