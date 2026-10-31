# Umbraco Analytics UI

Shared backoffice analytics components (Lit + UUI) consumed by Engage, Commerce and Umbraco AI. Shipped once per site via NuGet RCL + backoffice import map.

## Rules

- Components draw only. No API calls, no product contexts (`ENGAGE_*`, `UC_*`, `UAI_*`), no product types in the public API.
- Never expose Chart.js types or config in the public API. Wrap it in our own options types.
- Chart.js is bundled (not external). Only `@umbraco-cms/*` is external.
- Colours via UUI CSS custom properties only. Must work in light and dark mode.
- Number/date formatting via `Intl` with the backoffice user's culture. Currency and units come from the consumer.
- Every user-facing string (text, `aria-*`, `title`, `placeholder`, visually hidden text, announced joins and separators) goes through a localization key: reuse an Umbraco key for generic words (`general_*`, `buttons_*`), else add a `uauiAnalytics_*` key to `Client/src/lang/en.ts`. Keys are whole literals, never built from parts. `src/lang/localization.*.test.ts` fails on untranslated text, missing or unused keys.
- Everything exported from `Client/src/index.ts` is public API, including element names, attributes and event names.
- Minor versions must never break: one version is shared by every product on a site. Run `npm run check:api`; a changed `api/*.api.md` report needs explicit reviewer sign-off.
- Obsolete before removal: `@deprecated Use X instead. Will be removed in vN.0.0` (current major + 2).
- Package major = CMS major. Keep `version.json`, `Client/package.json` and the `Umbraco.Cms.*` range in `Directory.Packages.props` in sync.
- Prerelease suffixes are dot-separated: `-alpha.N`, `-beta.N`, `-rc.N`.
- Add a component only when at least two products need it.
- Componentize (single responsibility). Build each distinct UI piece (cell, pager, tooltip, legend, toolbar parts) as its own small element, internal under `src/internal/` or the component's `internal/` folder unless there's a reason to make it public. Composite elements compose them rather than rendering everything inline. Making an internal element public later is non-breaking; the reverse isn't.
- Consistency with UUI is a goal. Where UUI already has the pattern (property/attribute names, events and their cancelability, states like selectable/selected/disabled, focus, hover and selection visuals, sizes), mirror it. Read the UUI source in node_modules/@umbraco-ui/uui first. Deviate only to close a gap UUI has (e.g. accessibility) and log the deviation in the plan's DECISION-LOG.md. Don't import from `@umbraco-ui/uui/internal/*`: it isn't re-exported by the backoffice, so it would bundle a second UUI copy.
- Versioning: package major = CMS major (19.x for CMS 19); minor and patch are this package's own. Only breaking changes at a CMS major, since one version is shared by every product on a site.
- Branching: `v{major}/main` = latest release on that major (code only via release/hotfix merges); `v{major}/dev` = integration branch; work on `v{major}/topic/<name>` (any unit of work: feature, fix, experiment) and PR into `v{major}/dev`. Releases: `release/{semver}` off `v{major}/dev`, tag `release-{version}` on it, merge to `v{major}/main` after the build succeeds. Hotfixes: `hotfix/{semver}` off `v{major}/main`. Only `v19` exists for now.
- Component folder layout follows UUI: `<name>.element.ts`, `<name>.story.ts`, `<name>.test.ts`, `index.ts`. Element prefix `uaui-`.
- Every component needs a story covering each state and a test that includes `expect(await axeRun(el)).toHaveNoViolations()`.
- Import Lit only from `@umbraco-cms/backoffice/external/lit` (lint enforced).
- Before finishing: `npm run lint`, `npm test`, `npm run build` (commit any `api/*.api.md` change deliberately).
- Plan folders: `docs/plans/<feature-slug>/` (devkit feature-* skills). Design references: `docs/design/<name>/`.
