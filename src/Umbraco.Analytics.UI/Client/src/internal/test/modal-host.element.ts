// Tests and Storybook only; never imported by shipped code.
// A stand-in for the backoffice's modal plumbing: it provides UMB_MODAL_MANAGER_CONTEXT, renders the
// backoffice's own modal container so dialogs really open, and registers the package's modal manifests.
import { customElement, html } from "#platform/lit";
import { UauiLitElement } from "#platform/base-element";
import { umbExtensionsRegistry } from "@umbraco-cms/backoffice/extension-registry";
import { UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
// Registers umb-backoffice-modal-container
import "@umbraco-cms/backoffice/components";
import "../../date-range/date-range-modal.element.js";
import { manifests as dateRangeManifests } from "../../date-range/manifests.js";

function registerModalManifests() {
    for (const manifest of dateRangeManifests) {
        if (!umbExtensionsRegistry.isRegistered(manifest.alias)) umbExtensionsRegistry.register(manifest);
    }
}

@customElement("uaui-test-modal-host")
export class UauiTestModalHostElement extends UauiLitElement {
    constructor() {
        super();
        registerModalManifests();
        new UmbModalManagerContext(this);
    }

    override render() {
        return html`<slot></slot><umb-backoffice-modal-container></umb-backoffice-modal-container>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-test-modal-host": UauiTestModalHostElement;
    }
}
