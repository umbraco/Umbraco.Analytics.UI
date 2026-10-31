import { css } from "@umbraco-cms/backoffice/external/lit";

/** Internal. A `.visually-hidden` class: text for screen readers only. Its positioned parent clips it. */
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
