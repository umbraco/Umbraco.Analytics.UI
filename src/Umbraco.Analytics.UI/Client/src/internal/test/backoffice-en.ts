// The backoffice's English dictionary is not exposed through package exports, so reach it by path.
// Tests and Storybook only; never imported by shipped code.
import backofficeEn from "../../../node_modules/@umbraco-cms/backoffice/dist-cms/assets/lang/en.js";

export default backofficeEn;
