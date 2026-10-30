// INT-1: the shipped umbraco-package.json is hand-written JSON, so these specs keep it in step with the code.
import { describe, expect, it } from "vitest";
import raw from "../../../public/umbraco-package.json?raw";
import { UAX_EN_ALIAS, UAX_LOCALIZATION_WEIGHT } from "../localization/register.js";
import { uaxDateRangeModalManifest } from "../../date-range/manifests.js";

type ShippedExtension = Record<string, unknown> & { type: string; meta?: { culture?: string } };
const shipped = JSON.parse(raw) as { extensions: ShippedExtension[]; importmap: { imports: Record<string, string> } };
const extension = (type: string) => shipped.extensions.find((e) => e.type === type)!;

describe("Feature: the package registers itself in the backoffice", () => {
    describe("Scenario: the localization extension", () => {
        it("has the weight the code registers its translations at", () => {
            expect(extension("localization").weight).toBe(UAX_LOCALIZATION_WEIGHT);
        });

        it("has the alias the code registers its translations under", () => {
            expect(extension("localization").alias).toBe(UAX_EN_ALIAS);
        });

        it("is for English", () => {
            expect(extension("localization").meta?.culture).toBe("en");
        });

        it("loads lang/en.js from the package's static assets", () => {
            expect(extension("localization").js).toBe("/App_Plugins/Umbraco.Analytics.UI/lang/en.js");
        });
    });

    describe("Scenario: the date range modal extension", () => {
        it("has the alias of the modal token", () => {
            expect(extension("modal").alias).toBe(uaxDateRangeModalManifest.alias);
        });

        it("has the element name the dialog is defined as", () => {
            expect(extension("modal").elementName).toBe(uaxDateRangeModalManifest.elementName);
        });

        it("loads the bundle that defines the dialog, so it opens before any other element is used", () => {
            expect(extension("modal").element).toBe(shipped.importmap.imports["@umbraco-analytics/ui"]);
        });
    });
});
