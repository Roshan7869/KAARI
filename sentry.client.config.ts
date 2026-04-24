// Sentry client-side initialization is handled in instrumentation-client.ts.
// This file is kept for backwards compatibility with bundlers that don't
// support instrumentation-client.ts. It intentionally does not call Sentry.init()
// to avoid double initialization.
export {};
