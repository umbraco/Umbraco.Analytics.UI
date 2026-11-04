# Umbraco Analytics UI

Shared backoffice analytics components (Lit + UUI) consumed by Engage, Commerce and Umbraco AI. Shipped once per site via NuGet RCL + backoffice import map.

## Rules

- Components draw only. No API calls, no product contexts (`ENGAGE_*`, `UC_*`, `UAI_*`), no product types in the public API.
- Never expose Chart.js types or config in our public API (`src/index.ts`, `api/analytics-ui.api.md`). Wrap it in our own options types.
- Chart.js is bundled into its own entry, `src/external/chart.js/index.ts` (re-exported as is), mapped as `@umbraco/analytics-ui/external/chart.js` for products. Our code imports it only by that bare specifier (aliased to the source for tests, tsc and Storybook; external in the build), never `"chart.js"` or a relative path (lint enforced; `check:size` checks the bundle): the CMS cache-busts import map URLs, so a relative import loads a second copy. Only `@umbraco-cms/*` is external. Chart.js's major is part of our compatibility promise: a Chart.js major only at a CMS major.
- Register per chart, never globally: no `Chart.defaults` changes and no global `Chart.register` of plugins (pass them in the chart's `plugins`). Our chart sets everything it relies on per chart; `time-series-chart.isolation.test.ts` guards that.
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
- Reusing a component for a new purpose: you MUST re-evaluate its name (and folder) so it fits every use, e.g. `uaui-share-bar` became `uaui-meter-bar` in `src/internal/` once the progress cell used it. Internal elements rename freely; a public one needs the deprecate-then-remove route.
- Consistency with UUI is a goal. Where UUI already has the pattern (property/attribute names, events and their cancelability, states like selectable/selected/disabled, focus, hover and selection visuals, sizes), mirror it. Read the UUI source in node_modules/@umbraco-ui/uui first. Deviate only to close a gap UUI has (e.g. accessibility) and log the deviation in the plan's DECISION-LOG.md. Don't import from `@umbraco-ui/uui/internal/*`: it isn't re-exported by the backoffice, so it would bundle a second UUI copy.
- Versioning: package major = CMS major (19.x for CMS 19); minor and patch are this package's own. Only breaking changes at a CMS major, since one version is shared by every product on a site.
- Branching: `v{major}/main` = latest release on that major (code only via release/hotfix merges); `v{major}/dev` = integration branch; work on `v{major}/topic/<name>` (any unit of work: feature, fix, experiment) and PR into `v{major}/dev`. Releases: `release/{semver}` off `v{major}/dev`, tag `release-{version}` on it, merge to `v{major}/main` after the build succeeds. Hotfixes: `hotfix/{semver}` off `v{major}/main`. Only `v19` exists for now. Until the first release (user decision 02-11-2026), `v19/main` may be fast-forwarded to `v19/dev` to publish the Storybook docs; after the first release, release/hotfix merges only again.
- Component folder layout follows UUI: `<name>.element.ts`, `<name>.story.ts`, `<name>.test.ts`, `index.ts`. Element prefix `uaui-`.
- Every component needs a story covering each state and a test that includes `expect(await axeRun(el)).toHaveNoViolations()`.
- Import Lit only from `@umbraco-cms/backoffice/external/lit` (lint enforced).
- Changelog: any change a product team would notice adds a line under `## [Unreleased]` in `CHANGELOG.md`, in the same PR. That covers new or changed public elements, attributes, properties, events and exports (anything that moves `api/*.api.md`), visible UI changes, bug fixes, deprecations, and Chart.js or CMS range bumps. Tests, docs, stories, CI and refactors with no visible effect don't need one.
  - Put each line under `### Added`, `### Changed`, `### Deprecated`, `### Removed`, `### Fixed` or `### Security`. Write it for a product developer: name the element or export, say what changed and what they must do, one line each. A `@deprecated` line names the replacement and the removal version.
  - `### Security`: say only that it's fixed, with no detail, and only once the fix is released (responsible disclosure).
  - On the release branch, in the commit that sets the final version, rename `## [Unreleased]` to `## [{version}] - DD-MM-YYYY`, using the exact `version.json` version (e.g. `## [19.1.0] - 04-11-2026`), and add a new empty `## [Unreleased]` above it. RCs don't get their own section; their entries stay under Unreleased until the final release.
  - Once the pipeline sets `github_release_connection` (umbraco/Umbraco.Build#20), that section becomes the GitHub release notes, and a public build with no section for its version fails.
- Before finishing: `npm run lint`, `npm test`, `npm run build` (commit any `api/*.api.md` change deliberately).
- Plan folders: `docs/plans/<feature-slug>/` (devkit feature-* skills). Design references: `docs/design/<name>/`.
- Packages: NuGet `Umbraco.Analytics.UI`, npm `@umbraco/analytics-ui` (also the import map key). API report: `api/analytics-ui.api.md`.
- CI: Azure DevOps project "Umbraco Extensions", pipeline "Umbraco.Analytics.UI" (id 820). Service connection names in `azure-pipelines.yml` must exist in that project (NuGet: `MyGet - Nightly`, `MyGet - Pre-releases`, `NuGet`; npm: `npm - Nightly`, `npm - Pre-releases`). Don't copy names from other products' pipelines.
- CI restores with `--locked-mode`. After any package change, refresh and commit `packages.lock.json`. Keep `Umbraco.Cms.*` mapped to nuget.org only in `NuGet.config` (MyGet copies of CMS prereleases differ and fail NU1403).
- Files CI needs must not be gitignored. The Visual Studio `.gitignore` rules hide common names like `publish/`; check `git check-ignore` when adding build scripts.
