# Platform swap points

Rules for `src/platform/` beyond the root `CLAUDE.md`'s "Platform seam".

- `src/platform/localize.ts` is the contract both sides meet. In the Umbraco build `UauiLocalize` is `UmbLocalizationController` under our name, so the API report keeps printing the backoffice type; `tsconfig.core.json` checks shared code against the structural interface.
- Re-export forms that keep `api/analytics-ui.api.md` unchanged: a named value re-export (`export { UmbX as UauiX } from ...`), or a type via `import type { UmbX as UauiX }` then `export type { UauiX }`. `export type UauiX = UmbX` adds an `ae-forgotten-export`; check the report after any change here.
- Never `export *` from an external specifier in a shipped swap point: rolldown adds a namespace shim to the bundle. Use named re-exports, or a library-build alias in `platformBuildAlias` when the swap point only re-exports one external specifier.
- `observe(host, source, callback, alias)`: the alias is required, and the callback gets `undefined` when the source is undefined, on both sides. Without an alias the core would pile up subscriptions on reconnect.
- The core context follows the community `context-request` protocol and matches the token by identity, so `@lit/context` consumers can use our tokens as keys. Deliberate differences: it answers its own host, sends no `context-provider` event, and doesn't call back with `undefined` on disconnect.
- The core's translations: culture from the nearest `lang`, then `<html lang>`, then `en`; lookup culture, then language, then English. A bare `en` goes to `Intl` as is (US formats); the backoffice serves it as en-GB. Only `<html lang>` changes re-render. The store is per package copy.
- The core imports all of `@umbraco-ui/uui` at once (a peer the host provides). The core's fallback icons are only the 6 our elements draw; adding one makes it part of the compatibility promise.
- Files named `test-*.ts` here are test helpers. Shipped code never imports them; `src/internal/test/shipped-source.ts` leaves them out of its scans.
