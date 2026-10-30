# Umbraco Analytics UI

Shared backoffice charts, tables, KPI tiles and filters for the analytics sections of Umbraco products (Engage, Commerce, Umbraco AI).

> Working name. Owner, package name and element prefix are still to be agreed.

## What it is

- A Razor Class Library that ships built web components to `App_Plugins/Umbraco.Analytics.UI`.
- Registers `@umbraco-analytics/ui` in the backoffice import map, so every product on a site loads the same single copy.
- Components only draw. Products fetch their own data and pass it in.
- Chart.js is bundled inside and is not part of the public API.

## Packages

| Package | Feed | Purpose |
|---|---|---|
| `Umbraco.Analytics.UI` | NuGet | Puts the files on the site. Products reference it with a one-major range, e.g. `[19.0.0, 20.0.0)`. |
| `@umbraco-analytics/ui` | npm | Types only. Products add it as a dev dependency and mark `@umbraco-analytics/*` as external in Vite. |

Both share the version in `version.json`. The package major tracks the CMS major.

## Repo layout

```
src/Umbraco.Analytics.UI/
  Umbraco.Analytics.UI.csproj   RCL, no C# code
  Client/
    src/<component>/            one folder per component
    src/index.ts                public API
    public/umbraco-package.json import map registration
    api/                        API Extractor report (committed)
  wwwroot/                      build output (gitignored)
```

## Local development

```bash
cd src/Umbraco.Analytics.UI/Client
npm install
npx playwright install chromium   # once, for browser tests
npm run build            # types + API report + bundle to ../wwwroot
npm run watch            # rebuild on change
npm run storybook        # component previews on http://localhost:6006
npm test                 # browser tests (Chromium locally; Chromium, Firefox, WebKit on CI)
npm run lint
```

Tooling matches Umbraco UI (UUI): Storybook 10 with the light, dark and high-contrast backoffice themes, and Vitest browser mode with Playwright, `vitest-browser-lit` and an axe-core accessibility matcher.

Each component lives in its own folder:

```
src/delta-badge/
  delta-badge.element.ts   the component
  delta-badge.story.ts     Storybook stories
  delta-badge.test.ts      browser tests, including an a11y audit
  index.ts
```

To try changes inside a product, reference `src/Umbraco.Analytics.UI/Umbraco.Analytics.UI.csproj` from the product's test site instead of the NuGet package.

## Release

Uses the shared `umbraco/Umbraco.Build` pipeline (`azure-pipelines.yml`). Tag `release-{version}` on the release branch. Prereleases go to MyGet, stable releases to NuGet.org and npm.

The template runs the root `package.json` `ci:*` scripts to install, build and pack the client. A `ClientTests` stage then runs lint, the browser tests in Chromium, Firefox and WebKit, and a Storybook build. Publishing waits for it to pass.

## CI and Storybook

| Where | When | What |
|---|---|---|
| GitHub Actions (`.github/workflows/storybook.yml`) | Pull requests and pushes to `main` | Lint, build, API check, browser tests. On `main`, also publishes Storybook to GitHub Pages. |
| Azure DevOps (`azure-pipelines.yml`) | `release/*`, `hotfix/*`, `release-*` tags | Build, pack, SBOM, client tests, then MyGet / NuGet.org / npm. Storybook is attached to the run as an artifact. |
