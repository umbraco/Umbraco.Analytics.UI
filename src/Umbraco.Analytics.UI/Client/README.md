# @umbraco-analytics/ui

TypeScript types for Umbraco Analytics UI: shared backoffice charts, tables, KPI tiles and filters used by the analytics sections of Umbraco products.

> This npm package contains **types only**. The components themselves ship in the `Umbraco.Analytics.UI` NuGet package, which registers `@umbraco-analytics/ui` in the backoffice import map so every product on a site shares one copy.

## Using it in a backoffice extension

1. Reference the NuGet package from your package's project, with a range covering one CMS major:

   ```xml
   <PackageReference Include="Umbraco.Analytics.UI" Version="[19.0.0, 20.0.0)" />
   ```

2. Add the types as a dev dependency:

   ```bash
   npm install -D @umbraco-analytics/ui
   ```

3. Mark it as external in your bundler, so you use the backoffice's copy instead of bundling your own. For Vite:

   ```ts
   rollupOptions: {
     external: [/^@umbraco-cms\//, /^@umbraco-analytics\//],
   }
   ```

4. Import and use the components:

   ```ts
   import "@umbraco-analytics/ui";

   html`<uan-delta-badge .value=${12.4}></uan-delta-badge>`;
   ```

## Versioning

The package major matches the Umbraco CMS major. Minor and patch releases never break the public API: element names, attributes, events and types.
