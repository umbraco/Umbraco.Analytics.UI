/** Resolves after `ms` milliseconds. With no delay it resolves on the next microtask. */
export const wait = (ms: number): Promise<void> => (ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve());
