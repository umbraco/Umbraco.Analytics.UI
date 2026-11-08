import type { ReactiveController, ReactiveControllerHost } from "./lit.js";
import en from "../../lang/en.js";
import type { UauiLocalize } from "../localize.js";
import { fallbackEnglish } from "./fallback-en.js";

type Term = string | ((...args: unknown[]) => string);
type Dictionary = Record<string, Term>;
type Host = ReactiveControllerHost & HTMLElement;

const DEFAULT_CULTURE = "en";

const flatten = (nested: Record<string, Record<string, string>>): Dictionary =>
    Object.fromEntries(Object.entries(nested).flatMap(([section, terms]) => Object.entries(terms).map(([key, text]) => [`${section}_${key}`, text])));

const seedDictionaries = () => new Map<string, Dictionary>([[DEFAULT_CULTURE, { ...flatten(en), ...fallbackEnglish }]]);

interface Store {
    dictionaries: Map<string, Dictionary>;
    hosts: Set<Host>;
    observer?: MutationObserver;
}

const store: Store = { dictionaries: seedDictionaries(), hosts: new Set<Host>() };

const updateHosts = () => store.hosts.forEach((host) => host.requestUpdate());

/**
 * Adds or overrides translations for a culture. Keys are written whole, `uauiAnalytics_emptyHeadline`; a value is a
 * string (`{0}` and `%0%` are replaced by the arguments) or a function of the arguments. Elements already on the page re-render.
 */
export function registerUauiTranslations(culture: string, dictionary: Dictionary): void {
    const code = culture.toLowerCase();
    store.dictionaries.set(code, { ...store.dictionaries.get(code), ...dictionary });
    updateHosts();
}

/** Back to the built-in English only, for specs: they share one page-wide store. */
export function resetUauiTranslations(): void {
    store.dictionaries = seedDictionaries();
    updateHosts();
}

/** One observer for every connected host: `<html lang>` changes re-render them all. */
function watchDocumentLang(): void {
    if (store.hosts.size > 0 && !store.observer) {
        store.observer = new MutationObserver(updateHosts);
        store.observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    } else if (store.hosts.size === 0 && store.observer) {
        store.observer.disconnect();
        store.observer = undefined;
    }
}

/** The closest `lang`, from the element up through its ancestors and out of shadow roots, then `<html lang>`, then English. */
function resolveLang(host: HTMLElement): string {
    let node: Node | null = host;
    while (node) {
        const lang = node instanceof HTMLElement ? node.lang : "";
        if (lang) return validCulture(lang);
        node = node.parentNode instanceof ShadowRoot ? node.parentNode.host : node.parentNode;
    }
    return DEFAULT_CULTURE;
}

/** Lowercase, like the backoffice. A tag `Intl` rejects would throw on every render, so it counts as no `lang`. */
function validCulture(lang: string): string {
    try {
        return Intl.getCanonicalLocales(lang)[0].toLowerCase();
    } catch {
        return DEFAULT_CULTURE;
    }
}

/**
 * The core's `UauiLocalize`, behaving like the backoffice's `UmbLocalizationController`: `term` looks the key up in the
 * exact culture, then its language, then English, and returns the key itself when nobody has it.
 */
export class UauiLocalizationController implements UauiLocalize, ReactiveController {
    readonly #host: Host;

    constructor(host: Host) {
        this.#host = host;
        host.addController(this);
    }

    hostConnected(): void {
        store.hosts.add(this.#host);
        watchDocumentLang();
    }

    hostDisconnected(): void {
        store.hosts.delete(this.#host);
        watchDocumentLang();
    }

    lang(): string {
        return resolveLang(this.#host);
    }

    term(key: string, ...args: unknown[]): string {
        const lang = this.lang();
        const language = new Intl.Locale(lang).language;
        const term =
            store.dictionaries.get(lang)?.[key] || store.dictionaries.get(language)?.[key] || store.dictionaries.get(DEFAULT_CULTURE)?.[key];
        if (!term) return key;
        if (typeof term === "function") return term(...args);
        if (!args.length) return String(term);
        // "%index%" and "{index}", as the backoffice does; a placeholder with no argument stays as written.
        return term.replace(/(%(\d+)%|\{(\d+)\})/g, (match, _all, percent, brace) => {
            const value = args[Number(percent || brace)];
            return typeof value !== "undefined" ? String(value) : match;
        });
    }

    date(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
        return new Intl.DateTimeFormat(this.lang(), options).format(new Date(date));
    }

    number(number: number | string, options?: Intl.NumberFormatOptions): string {
        const value = Number(number);
        return isNaN(value) ? "" : new Intl.NumberFormat(this.lang(), options).format(value);
    }
}
