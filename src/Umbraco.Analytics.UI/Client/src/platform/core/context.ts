import type { ReactiveController, ReactiveControllerHost } from "./lit.js";

// Core swap point: contexts and observable state with no backoffice. Contexts speak the community `context-request`
// protocol (the one `@lit/context` uses), so a cell can also consume them with `@lit/context` or a plain event.

/** The element a context is provided from or consumed on. A plain `LitElement` fits. */
export type UauiContextProviderHost = ReactiveControllerHost & HTMLElement;

/** What a provided context must have: the element it is provided from. */
export interface UauiContextMinimal {
    getHostElement(): Element;
}

/**
 * Names a context. Used directly as the `context` key of a `context-request` event (consumers and providers match
 * it by identity, so keep one instance per context, as a module constant).
 */
export class UauiContextToken<BaseType extends UauiContextMinimal = UauiContextMinimal, ResultType extends BaseType = BaseType> {
    /** Type-only: the type a consumer receives. Never set at runtime. */
    declare readonly TYPE: ResultType;

    constructor(readonly contextAlias: string) {}

    toString(): string {
        return this.contextAlias;
    }
}

// ---- Observable state ----

/** The smallest observable the helpers need: `subscribe` calls back with the current value, then every change. */
export interface Observable<T> {
    subscribe(callback: (value: T) => void): { unsubscribe(): void };
}

/** A value that tells its subscribers when it changes. Subscribers get the current value straight away. */
export class UauiBasicState<T> {
    #value: T;
    #subscribers = new Set<(value: T) => void>();

    constructor(initial: T) {
        this.#value = initial;
    }

    #observable: Observable<T> = {
        subscribe: (callback) => {
            this.#subscribers.add(callback);
            callback(this.#value);
            return { unsubscribe: () => void this.#subscribers.delete(callback) };
        },
    };

    asObservable(): Observable<T> {
        return this.#observable;
    }

    getValue(): T {
        return this.#value;
    }

    /** Subscribers are only told when the value is not the same one as before. */
    setValue(value: T): void {
        if (value === this.#value) return;
        this.#value = value;
        for (const subscriber of [...this.#subscribers]) subscriber(value);
    }
}

/** A state holding an object, which can also be updated a few fields at a time. */
export class UauiObjectState<T extends object> extends UauiBasicState<T> {
    update(partial: Partial<T>): void {
        this.setValue({ ...this.getValue(), ...partial });
    }
}

// ---- Provider ----

/** The `context-request` event of the community protocol, as `@lit/context` sends it. */
interface ContextRequest {
    readonly context: unknown;
    readonly callback: (value: unknown, unsubscribe?: () => void) => void;
    readonly subscribe?: boolean;
    stopPropagation(): void;
}

/**
 * Provides itself as the context `token` names to everything below `host`, by answering `context-request` events.
 * Extend it, as the backoffice's `UmbContextBase` is extended. Call `destroy()` to stop answering.
 */
export abstract class UauiContextBase implements UauiContextMinimal {
    #host: UauiContextProviderHost;
    #token: UauiContextToken;

    constructor(host: UauiContextProviderHost, token: UauiContextToken) {
        this.#host = host;
        this.#token = token;
        host.addEventListener("context-request", this.#onRequest);
    }

    getHostElement(): Element {
        return this.#host;
    }

    destroy(): void {
        this.#host.removeEventListener("context-request", this.#onRequest);
    }

    #onRequest = (event: Event): void => {
        const request = event as unknown as ContextRequest;
        if (request.context !== this.#token) return;
        request.stopPropagation();
        if (!request.subscribe) {
            request.callback(this);
            return;
        }
        // This context is always the same instance, so a subscriber only needs the one answer and nothing to unsubscribe from.
        request.callback(this, () => {});
    };
}

// ---- Consumer and observer helpers ----

/** What the helpers need from an element. A plain `LitElement` fits. */
export type UauiContextHost = ReactiveControllerHost & HTMLElement;

class ContextConsumer<T extends UauiContextMinimal> implements ReactiveController {
    #unsubscribe?: () => void;

    constructor(
        private host: UauiContextHost,
        private token: UauiContextToken<T, T>,
        private callback: (value: T | undefined) => void,
    ) {
        host.addController(this);
    }

    hostConnected(): void {
        // Fresh each connect, so a provider found before a move is not trusted after it.
        this.#unsubscribe?.();
        const event = new Event("context-request", { bubbles: true, composed: true });
        Object.assign(event, {
            context: this.token,
            subscribe: true,
            callback: (value: T, unsubscribe?: () => void) => {
                if (unsubscribe !== this.#unsubscribe) {
                    this.#unsubscribe?.();
                    this.#unsubscribe = unsubscribe;
                }
                this.callback(value);
            },
        });
        this.host.dispatchEvent(event);
    }

    hostDisconnected(): void {
        this.#unsubscribe?.();
        this.#unsubscribe = undefined;
    }
}

/** Calls `callback` with the context `token` names, from the nearest provider above `host`, and again if it changes. */
export function consumeContext<T extends UauiContextMinimal>(host: UauiContextHost, token: UauiContextToken<T, T>, callback: (value: T | undefined) => void): void {
    new ContextConsumer(host, token, callback);
}

class Observation<T> implements ReactiveController {
    #subscription?: { unsubscribe(): void };

    constructor(
        private host: UauiContextHost,
        private source: Observable<T>,
        private callback: (value: T | undefined) => void,
        private onEnd: () => void,
    ) {
        host.addController(this);
        this.#subscribe();
    }

    // Like the backoffice's observer: pause while the host is disconnected, listen again when it reconnects.
    hostConnected(): void {
        this.#subscribe();
    }

    hostDisconnected(): void {
        this.#unsubscribe();
    }

    #subscribe(): void {
        this.#subscription ??= this.source.subscribe(this.callback);
    }

    #unsubscribe(): void {
        this.#subscription?.unsubscribe();
        this.#subscription = undefined;
    }

    end(): void {
        this.#unsubscribe();
        this.host.removeController(this);
        this.onEnd();
    }
}

const observations = new WeakMap<UauiContextHost, Map<string | symbol, Observation<never>>>();

/**
 * Calls `callback` with each value `source` emits, while `host` is connected (it listens again if the host reconnects). `alias` replaces an earlier
 * observer of the same alias. When `source` is undefined, `callback` is called with undefined (every implementation keeps this).
 */
export function observe<T>(host: UauiContextHost, source: Observable<T> | undefined, callback: (value: T | undefined) => void, alias?: string): void {
    let byAlias = observations.get(host);
    if (!byAlias) observations.set(host, (byAlias = new Map()));
    // Without an alias every call is its own observer.
    const key = alias ?? Symbol();
    byAlias.get(key)?.end();
    if (!source) {
        callback(undefined);
        return;
    }
    const observation = new Observation(host, source, callback, () => {
        if ((byAlias.get(key) as unknown) === observation) byAlias.delete(key);
    });
    byAlias.set(key, observation as unknown as Observation<never>);
}
