// The core Vitest project aliases every `@umbraco-cms/*` import here (see vite.config.ts), so loading one fails the spec.
throw new Error("The core test project must not import @umbraco-cms/*: that code needs the backoffice. Move the spec to src/platform/umbraco/.");
