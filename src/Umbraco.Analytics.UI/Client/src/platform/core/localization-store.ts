import type { ReactiveControllerHost } from "./lit.js";
import en from "../../lang/en.js";
import { fallbackEnglish } from "./fallback-en.js";
import type { UauiTranslations } from "./localization.js";

// The page-wide translation store, apart from localization.ts so a spec can reset it without a reset export in shipped code.

export type Dictionary = UauiTranslations;
export type Host = ReactiveControllerHost & HTMLElement;

export const DEFAULT_CULTURE = "en";

const flatten = (nested: Record<string, Record<string, string>>): Dictionary =>
    Object.fromEntries(Object.entries(nested).flatMap(([section, terms]) => Object.entries(terms).map(([key, text]) => [`${section}_${key}`, text])));

export const seedDictionaries = () => new Map<string, Dictionary>([[DEFAULT_CULTURE, { ...flatten(en), ...fallbackEnglish }]]);

export interface Store {
    dictionaries: Map<string, Dictionary>;
    hosts: Set<Host>;
    observer?: MutationObserver;
}

export const store: Store = { dictionaries: seedDictionaries(), hosts: new Set<Host>() };

export const updateHosts = () => store.hosts.forEach((host) => host.requestUpdate());

