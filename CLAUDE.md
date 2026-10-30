# Umbraco Analytics UI

Shared backoffice analytics components (Lit + UUI) consumed by Engage, Commerce and Umbraco AI. Shipped once per site via NuGet RCL + backoffice import map.

## Rules

- Components draw only. No API calls, no product contexts (`ENGAGE_*`, `UC_*`, `UAI_*`), no product types in the public API.
- Never expose Chart.js types or config in the public API. Wrap it in our own options types.
- Chart.js is bundled (not external). Only `@umbraco-cms/*` is external.
- Colours via UUI CSS custom properties only. Must work in light and dark mode.
- Number/date formatting via `Intl` with the backoffice user's culture. Currency and units come from the consumer.
- Everything exported from `Client/src/index.ts` is public API, including element names, attributes and event names.
- Minor versions must never break: one version is shared by every product on a site. Run `npm run check:api`; a changed `api/*.api.md` report needs explicit reviewer sign-off.
- Obsolete before removal: `@deprecated Use X instead. Will be removed in vN.0.0` (current major + 2).
- Package major = CMS major. Keep `version.json`, `Client/package.json` and the `Umbraco.Cms.*` range in `Directory.Packages.props` in sync.
- Prerelease suffixes are dot-separated: `-alpha.N`, `-beta.N`, `-rc.N`.
- Add a component only when at least two products need it.
- Branching and release process follow the Umbraco Commerce conventions (`topic/{major}.x/{name}`, `release/*`, `release-*` tags).
- Component folder layout follows UUI: `<name>.element.ts`, `<name>.story.ts`, `<name>.test.ts`, `index.ts`. Element prefix `uan-`.
- Every component needs a story covering each state and a test that includes `expect(await axeRun(el)).toHaveNoViolations()`.
- Import Lit only from `@umbraco-cms/backoffice/external/lit` (lint enforced).
- Before finishing: `npm run lint`, `npm test`, `npm run build` (commit any `api/*.api.md` change deliberately).
