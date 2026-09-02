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
