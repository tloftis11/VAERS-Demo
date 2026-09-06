import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// `globals: false` in vitest.config.ts means RTL's own auto-cleanup (which
// only self-registers when it detects a global `afterEach`) never runs —
// without this, DOM nodes from one test in a file leak into the next,
// silently producing "found multiple elements" failures in later tests.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement window.scrollTo — calling it logs a noisy "Not
// implemented" error to the console instead of throwing. ConversationalStep
// calls it on every question change, which every test rendering that
// component (directly or via a *Step wrapper) hits, so this is a global
// no-op default rather than something each test file has to stub for
// itself. Individual tests that need to assert on the call still override
// it with their own `vi.spyOn(window, "scrollTo")`.
window.scrollTo = () => {};
