/**
 * Calls `onChange` (once per burst of changes at most) when a stylesheet is added, removed or edited in the
 * document head, or a `<link>` stylesheet finishes loading. That is how a theme switch looks from
 * here: the backoffice swaps a `<style>` or `<link>` in the head, and Storybook edits the text of one.
 * The caller compares the resolved colours and redraws only when they changed, so unrelated head
 * changes cost one cheap check.
 *
 * All charts on a page share one observer, one `load` listener and one timer: they
 * subscribe to it and it runs while at least one is subscribed.
 *
 * `UMB_THEME_CONTEXT` was not used: it announces the new theme alias before the stylesheet has
 * loaded, so a redraw on it would read the old colours, and it doesn't exist outside the backoffice
 * (Storybook, tests).
 *
 * @returns a function that stops watching.
 */
export function watchTheme(onChange: () => void): () => void {
    subscribers.add(onChange);
    if (subscribers.size === 1) start();
    return () => {
        subscribers.delete(onChange);
        if (subscribers.size === 0) stop();
    };
}

const subscribers = new Set<() => void>();
let observer: MutationObserver | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

const isSheet = (node: Node | null): boolean =>
    node instanceof HTMLStyleElement || node instanceof HTMLLinkElement || node?.parentElement instanceof HTMLStyleElement;

const touchesSheet = (record: MutationRecord) =>
    isSheet(record.target) || [...record.addedNodes, ...record.removedNodes].some(isSheet);

// A short timer rather than `requestAnimationFrame`, which doesn't fire in a page that isn't visible
// (a background tab, a headless test frame), so the chart would keep its old colours.
function schedule() {
    if (timer !== undefined) return;
    timer = setTimeout(() => {
        timer = undefined;
        subscribers.forEach((notify) => notify());
    }, 30);
}

// A `<link>` theme applies when it loads, and `load` doesn't bubble.
const onLoad = (event: Event) => {
    if (event.target instanceof HTMLLinkElement) schedule();
};

function start() {
    observer = new MutationObserver((records) => {
        if (records.some(touchesSheet)) schedule();
    });
    observer.observe(document.head, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["href", "media"],
    });
    document.addEventListener("load", onLoad, true);
}

function stop() {
    observer?.disconnect();
    observer = undefined;
    document.removeEventListener("load", onLoad, true);
    clearTimeout(timer);
    timer = undefined;
}
