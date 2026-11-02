import { server, userEvent } from "vitest/browser";

/** The focused element, looking into shadow roots, so a move between two elements of one host still counts. */
function deepActiveElement(): Element | null {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    return active;
}

async function sendTab(shift: boolean): Promise<void> {
    // WebKit on macOS follows Safari's default: Tab skips buttons and links ("Press Tab to highlight each item" is
    // off) and Option+Tab reaches them. WebKit on Linux, Chromium and Firefox reach them with plain Tab, and Firefox
    // ignores Alt+Tab altogether, so only WebKit on macOS gets Option.
    if (server.browser === "webkit" && server.platform === "darwin") {
        await userEvent.keyboard(shift ? "{Alt>}{Shift>}{Tab}{/Shift}{/Alt}" : "{Alt>}{Tab}{/Alt}");
        return;
    }
    await userEvent.tab({ shift });
}

/**
 * Presses Tab (or Shift+Tab) the way an editor with full keyboard access does, the same in every engine.
 * Use this instead of `userEvent.tab()` for any spec that tabs.
 *
 * Playwright's WebKit on Linux now and then drops the default action of a Tab when several test files run at once:
 * the keydown reaches the focused element, isn't cancelled, and focus doesn't move. When that happens (focus is
 * exactly where it was and nothing cancelled or stopped the keydown) it presses Tab once more. A component that
 * cancels Tab, stops it, or leaves focus where it was on every press still fails, as the second press does the same.
 */
export async function pressTab(options: { shift?: boolean } = {}): Promise<void> {
    const shift = options.shift === true;
    const before = deepActiveElement();
    const hadFocus = document.hasFocus();
    let keydown: KeyboardEvent | undefined;
    const record = (event: KeyboardEvent) => {
        if (event.key === "Tab") keydown = event;
    };
    window.addEventListener("keydown", record);
    try {
        await sendTab(shift);
    } finally {
        window.removeEventListener("keydown", record);
    }
    // Focus leaving the test frame also leaves its active element in place, so the frame must still have focus too.
    const dropped =
        server.browser === "webkit" &&
        keydown !== undefined &&
        !keydown.defaultPrevented &&
        hadFocus &&
        document.hasFocus() &&
        deepActiveElement() === before;
    if (dropped) await sendTab(shift);
}
