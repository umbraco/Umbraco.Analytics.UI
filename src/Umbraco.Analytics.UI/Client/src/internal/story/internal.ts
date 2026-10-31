// Story-only helper: the shared "Not public API" marking of every story under "Internal".

// Every internal story also sets `tags: ["internal"]` as a literal (Storybook's indexer needs a literal),
// which is what `.storybook/main.ts` leaves out of the published Storybook.

/** The note shown at the top of an internal element's docs page: `what` is one sentence saying what the element is. */
export const notPublicApi = (what: string) =>
    `> **Not public API.** ${what} This is internal to the package and not exported, so names, properties and events can change in any release. Use the public component that contains it. These stories are for working on the package and are left out of the published Storybook.`;
