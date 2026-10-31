// Tests only; never imported by shipped code. Finds text a package element draws that did not come from a
// translation key: render with every key mapped to a marker, then list the words left over.
import { umbExtensionsRegistry } from "@umbraco-cms/backoffice/extension-registry";
import en from "../../lang/en.js";
import { usedUmbracoKeys } from "./shipped-source.js";
import { waitForKey } from "./localization.js";

const ALIAS = "Uaui.Localization.Markers";
const MARKER = /⟦[^⟧]*⟧/g;

/** What a key reads as while the markers are registered. Its arguments are dropped, so only the key's own text is left. */
export const markerFor = (key: string) => `⟦${key}⟧`;

/**
 * Maps every `uauiAnalytics_*` key, and every Umbraco key the package reuses, to its marker, ahead of the package's
 * and the backoffice's own English text. Returns a function that removes them again.
 */
export async function registerMarkerTranslations(): Promise<() => void> {
    const localizations: Record<string, Record<string, string>> = { uauiAnalytics: {} };
    for (const key of Object.keys(en.uauiAnalytics)) localizations.uauiAnalytics[key] = markerFor(`uauiAnalytics_${key}`);
    for (const key of usedUmbracoKeys()) {
        const [section, name] = key.split("_");
        (localizations[section] ??= {})[name] = markerFor(key);
    }
    umbExtensionsRegistry.register({
        type: "localization",
        alias: ALIAS,
        name: "Uaui markers (test)",
        weight: 50,
        meta: { culture: "en", localizations },
    });
    await waitForKey("uauiAnalytics_emptyHeadline", markerFor("uauiAnalytics_emptyHeadline"));
    return () => umbExtensionsRegistry.unregister(ALIAS);
}

const TEXT_ATTRIBUTES = ["aria-label", "aria-description", "aria-roledescription", "aria-valuetext", "title", "placeholder", "alt", "label"];
// UUI sets these as properties from our templates (`.label=${...}`), and some are not reflected to attributes.
const TEXT_PROPERTIES = ["label", "headline", "placeholder", "title"] as const;
const NOT_TEXT = new Set(["STYLE", "SCRIPT", "CANVAS"]);

/**
 * Every string `root` shows or announces: text nodes (visually hidden text too) and the attributes that name
 * things. It reads inside the shadow roots of `uaui-` elements and not of `uui-` or `umb-` ones, whose text is theirs.
 */
export function announcedStrings(root: Node): string[] {
    if (root.nodeType === Node.TEXT_NODE) return [root.textContent ?? ""];
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return [];
    const element = root as Element;
    if (NOT_TEXT.has(element.tagName)) return [];
    const strings: string[] = [];
    for (const name of TEXT_ATTRIBUTES) {
        const value = element.getAttribute?.(name);
        if (value) strings.push(value);
    }
    for (const name of TEXT_PROPERTIES) {
        const value = (element as unknown as Record<string, unknown>)[name];
        if (typeof value === "string" && value) strings.push(value);
    }
    if (element.shadowRoot && element.tagName.startsWith("UAUI-")) strings.push(...announcedStrings(element.shadowRoot));
    for (const child of root.childNodes) strings.push(...announcedStrings(child));
    return strings;
}

// The sample data is written DATA, DATA1... and dates come out of Intl with English month names (exact names only,
// so a word that merely starts like one, such as "Marker", is still reported).
const DATA_VALUES = /DATA\d*|\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/g;

/** The words in `root` that are neither a translated marker nor sample data: hard-coded text. */
export function untranslatedWords(root: Node): string[] {
    const text = announcedStrings(root).join(" ").replace(MARKER, " ").replace(DATA_VALUES, " ");
    return text.match(/\p{L}+/gu) ?? [];
}
