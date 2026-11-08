/*!
 * Artwork below is from Lucide (via the Umbraco backoffice icon set). Lucide's licence:
 *
 * ISC License
 *
 * Copyright (c) 2026 Lucide Icons and Contributors
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The following Lucide icons are derived from the Feather project:
 *
 * airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle, x-octagon, x-square, x, zoom-in, zoom-out
 *
 * The MIT License (MIT) (for the icons listed above)
 *
 * Copyright (c) 2013-present Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// Fallback icons for the core build. The backoffice has an icon registry; a host page may not, and then uui-icon draws
// nothing. This answers uui-icon's icon request for the few names our own elements draw, and only when no registry
// closer to the icon has accepted it, so a host's own registry always wins. Each body below is copied as is; the
// shared wrapper is the backoffice's, minus its class.
import { UUIIconRequestEvent } from "@umbraco-ui/uui";

const icon = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" viewBox="0 0 24 24">${body}</svg>`;

const ICONS: Record<string, string> = {
  "icon-alert": icon(
    `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4M12 17h.01"/>`,
  ),
  "icon-search": icon(
    `<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>`,
  ),
  "icon-calendar": icon(
    `<path d="M8 2v3M16 2v3"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M9 15l2 2 4-4"/>`,
  ),
  "icon-navigation-left": icon(`<path d="m15 18-6-6 6-6"/>`),
  "icon-navigation-right": icon(`<path d="m9 18 6-6-6-6"/>`),
  "icon-delete": icon(`<path d="M18 6 6 18M6 6l12 12"/>`),
};

const onIconRequest = (event: Event) => {
  const request = event as UUIIconRequestEvent;
  if (request.icon !== null) return;
  const svg = Object.prototype.hasOwnProperty.call(
    ICONS,
    request.detail.iconName,
  )
    ? ICONS[request.detail.iconName]
    : undefined;
  if (svg !== undefined) request.acceptRequest(Promise.resolve(svg));
};

// One listener per module, and a second copy of this module is harmless: the first to answer stops the event. On
// window we answer last on the bubble path, so a registry attached to document or any element wins. Only a registry
// attached to window before the core loads would lose.
window.addEventListener(UUIIconRequestEvent.ICON_REQUEST, onIconRequest);
