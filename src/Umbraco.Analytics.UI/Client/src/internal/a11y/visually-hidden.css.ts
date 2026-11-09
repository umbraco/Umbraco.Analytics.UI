import { css } from "#platform/lit";

/**
 * Internal. A `.visually-hidden` class: text for screen readers only. Its positioned parent clips it.
 *
 * Put it on a block or inline box, never on a `<table>` (or other box with an intrinsic min width): a table can't be
 * narrower than its min-content, so `width: 1px` is ignored and it widens the page's scrollable area. Wrap the table in
 * a `<div class="visually-hidden">` instead.
 */
export const UauiVisuallyHiddenStyles = css`
    .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
    }
`;
