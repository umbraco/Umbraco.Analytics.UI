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
npm run build      # types + API report + bundle to ../wwwroot
npm run watch      # rebuild on change
npm test
```

To try changes inside a product, reference `src/Umbraco.Analytics.UI/Umbraco.Analytics.UI.csproj` from the product's test site instead of the NuGet package.

## Release

Uses the shared `umbraco/Umbraco.Build` pipeline. Tag `release-{version}` on the release branch. Prereleases go to MyGet, stable releases to NuGet.org and npm.
