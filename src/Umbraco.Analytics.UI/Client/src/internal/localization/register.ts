import { umbExtensionsRegistry } from "@umbraco-cms/backoffice/extension-registry";
import { umbLocalizationRegistry } from "@umbraco-cms/backoffice/localization";
import type { UmbLocalizationDictionary } from "@umbraco-cms/backoffice/localization-api";
import en from "../../lang/en.js";

export const UAN_EN_ALIAS = "Uan.Localization.En";
const BACKOFFICE_EN_ALIAS = "Uan.Localization.BackofficeEn";

/**
 * Lower weights are merged last and win. The package sits at 200 so a product's own
 * `localization` extension at the default weight (100) always overrides it.
 */
export const UAN_LOCALIZATION_WEIGHT = 200;

/**
 * Registers the package's English translations the way its `localization` extension does, for
 * the test helper and Storybook (outside the backoffice). Pass the backoffice's own English
 * dictionary to make the Umbraco keys elements reuse (`buttons_save`, `general_close`, ...)
 * resolve too; it sits behind the package so it never overrides it.
 */
export function registerUanLocalization(backofficeEn?: UmbLocalizationDictionary): void {
    if (backofficeEn && !umbExtensionsRegistry.isRegistered(BACKOFFICE_EN_ALIAS)) {
        umbExtensionsRegistry.register({
            type: "localization",
            alias: BACKOFFICE_EN_ALIAS,
            name: "Backoffice English (Uan test and Storybook)",
            weight: UAN_LOCALIZATION_WEIGHT + 100,
            meta: { culture: "en", localizations: backofficeEn },
        });
    }
    if (!umbExtensionsRegistry.isRegistered(UAN_EN_ALIAS)) {
        umbExtensionsRegistry.register({
            type: "localization",
            alias: UAN_EN_ALIAS,
            name: "Uan English",
            weight: UAN_LOCALIZATION_WEIGHT,
            meta: { culture: "en", localizations: en },
        });
    }
    umbLocalizationRegistry.loadLanguage("en");
}
