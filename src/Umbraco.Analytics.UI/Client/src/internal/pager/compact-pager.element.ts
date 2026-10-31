import { css, customElement, html, property, type CSSResultGroup } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { getNumberFormat } from "../format/number-format.js";

/** What `page-change` carries: the page (from 1) and page size the editor chose. */
export type CompactPagerChangeDetail = { page: number; pageSize: number };

/**
 * A compact pager for any paged list: a page size picker ("Per page"), the range ("1–10 of 272") and previous and next buttons. Internal: not exported.
 *
 * It is controlled: it draws `page`, `pageSize` and `total` and raises `page-change` with the page and size the
 * editor chose, without changing them. The host sets them in response. The event doesn't bubble.
 * When Next lands on the last page (or Previous on the first) and the focused button becomes disabled, focus moves
 * to the other nav button, so a keyboard user isn't dropped as with `uui-pagination`.
 *
 * @element uaui-compact-pager
 * @fires page-change - The editor picked another page or page size. `detail` is `{ page, pageSize }`. Doesn't bubble.
 */
@customElement("uaui-compact-pager")
export class UauiCompactPagerElement extends UmbLitElement {
    /** The page shown, starting at 1. */
    @property({ type: Number })
    page = 1;

    /** Items per page. */
    @property({ type: Number, attribute: "page-size" })
    pageSize = 10;

    /** How many items there are across every page. */
    @property({ type: Number })
    total = 0;

    /** The page sizes to offer. */
    @property({ attribute: false })
    pageSizes: number[] = [10, 25, 50, 100];

    /** Which nav button had focus when it was clicked (1 next, -1 previous), until the new page is drawn. */
    #refocus?: 1 | -1;

    get #pageCount(): number {
        return Math.max(1, Math.ceil(this.total / this.pageSize));
    }

    #changePage(page: number, pageSize: number) {
        this.dispatchEvent(new CustomEvent<CompactPagerChangeDetail>("page-change", { detail: { page, pageSize } }));
    }

    #step(by: 1 | -1) {
        const button = this.renderRoot.querySelector<HTMLElement>(by === 1 ? ".next" : ".previous");
        this.#refocus = button?.matches(":focus-within") ? by : undefined;
        this.#changePage(this.page + by, this.pageSize);
    }

    #onPageSizeChange(event: Event) {
        const size = Number((event.target as HTMLElement & { value: string }).value);
        if (!Number.isInteger(size) || size < 1 || size === this.pageSize) return;
        this.#changePage(1, size);
    }

    protected override updated() {
        const by = this.#refocus;
        if (!by) return;
        this.#refocus = undefined;
        const atEnd = by === 1 ? this.page >= this.#pageCount : this.page <= 1;
        if (atEnd) this.renderRoot.querySelector<HTMLElement>(by === 1 ? ".previous" : ".next")?.focus();
    }

    override render() {
        const size = this.pageSize;
        const page = this.page;
        const total = this.total;
        const format = getNumberFormat(this.localize.lang()).format;
        const from = (page - 1) * size + 1;
        const to = Math.min(total, page * size);
        return html`<div class="pager" role="navigation" aria-label=${this.localize.term("uauiAnalytics_pagerLabel")}>
            <div class="page-size">
                <span aria-hidden="true">${this.localize.term("uauiAnalytics_pagerPageSize")}</span>
                <uui-select
                    name="page-size"
                    label=${this.localize.term("uauiAnalytics_pagerPageSize")}
                    .options=${this.pageSizes.map((option) => ({ name: String(option), value: String(option), selected: option === size }))}
                    .value=${String(size)}
                    @change=${this.#onPageSizeChange}></uui-select>
            </div>
            <div class="range" aria-live="polite">${this.localize.term("uauiAnalytics_pagerPosition", format(from), format(to), format(total))}</div>
            <div class="nav">
                <uui-button
                    class="previous"
                    compact
                    label=${this.localize.term("uauiAnalytics_pagerPreviousPage")}
                    ?disabled=${page <= 1}
                    @click=${() => page > 1 && this.#step(-1)}>
                    <uui-icon name="icon-navigation-left"></uui-icon>
                </uui-button>
                <uui-button
                    class="next"
                    compact
                    label=${this.localize.term("uauiAnalytics_pagerNextPage")}
                    ?disabled=${page >= this.#pageCount}
                    @click=${() => page < this.#pageCount && this.#step(1)}>
                    <uui-icon name="icon-navigation-right"></uui-icon>
                </uui-button>
            </div>
        </div>`;
    }

    static override styles: CSSResultGroup = css`
        :host {
            display: block;
        }

        /* Just the controls: the page size picker, the range, then previous and next. The host owns the border and padding. */
        .pager {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            flex-wrap: wrap;
            gap: var(--uui-size-space-4);
            font-size: 12px;
            color: var(--uui-color-text-alt);
        }

        .page-size,
        .nav {
            display: inline-flex;
            align-items: center;
            gap: var(--uui-size-space-2);
        }

        .range {
            font-variant-numeric: tabular-nums;
        }

        uui-select {
            font-size: inherit;
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-compact-pager": UauiCompactPagerElement;
    }
}
