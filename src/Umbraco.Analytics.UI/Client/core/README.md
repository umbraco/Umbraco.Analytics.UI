# @umbraco/analytics-ui-core

Umbraco Analytics UI for use outside the Umbraco backoffice: the same charts, tables, KPI tiles and filters as web components, in one ES module.

Inside the backoffice, use the `Umbraco.Analytics.UI` NuGet package and `@umbraco/analytics-ui` instead.

## Install

```sh
npm install @umbraco/analytics-ui-core lit @umbraco-ui/uui
```

`lit` and `@umbraco-ui/uui` are peer dependencies: your page provides them, so there is one copy of each. `chart.js` is installed with this package. The page must also load UUI's theme CSS (light or dark), or the elements are unstyled.

## Use

```ts
import "@umbraco/analytics-ui-core";
```

Importing the module registers the `uaui-*` elements. Register translations for the user's culture with `registerUauiTranslations`.
