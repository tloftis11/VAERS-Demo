import { describe, expect, it } from "vitest";
import { getApplicableSteps, isStepUnlocked, type BranchingState } from "./branchingRules";

/**
 * PROV-004: administrationError and adverseEventOccurred are independent
 * (PROV-002/003) — a report can have both, either, or neither. These tests
 * cover all four HCP combinations plus the public path, which never asks
 * either question.
 */
describe("getApplicableSteps — HCP branching", () => {
  const base: Omit<BranchingState, "administrationError" | "adverseEventOccurred"> = {
    submitterType: "hcp",
  };

  it("neither answered yet: defaults to showing adverse-event, not error-detail", () => {
    const steps = getApplicableSteps({ ...base, administrationError: null, adverseEventOccurred: null });
    expect(steps).toContain("adverse-event");
    expect(steps).not.toContain("error-detail");
  });

  it("administration error only: shows error-detail, not adverse-event", () => {
    const steps = getApplicableSteps({
      ...base,
      administrationError: true,
      adverseEventOccurred: false,
    });
    expect(steps).toContain("error-detail");
    expect(steps).not.toContain("adverse-event");
  });

  it("adverse event only: shows adverse-event, not error-detail", () => {
    const steps = getApplicableSteps({
      ...base,
      administrationError: false,
      adverseEventOccurred: true,
    });
    expect(steps).toContain("adverse-event");
    expect(steps).not.toContain("error-detail");
  });

  it("both true: shows both error-detail and adverse-event", () => {
    const steps = getApplicableSteps({
      ...base,
      administrationError: true,
      adverseEventOccurred: true,
    });
    expect(steps).toContain("error-detail");
    expect(steps).toContain("adverse-event");
  });

  it("both false: shows neither detail step", () => {
    const steps = getApplicableSteps({
      ...base,
      administrationError: false,
      adverseEventOccurred: false,
    });
    expect(steps).not.toContain("error-detail");
    expect(steps).not.toContain("adverse-event");
  });

  it("includes both gating questions as their own steps", () => {
    const steps = getApplicableSteps({ ...base, administrationError: null, adverseEventOccurred: null });
    expect(steps).toContain("administration-error");
    expect(steps).toContain("adverse-event-occurred");
  });
});

describe("getApplicableSteps — public path", () => {
  it("always shows adverse-event, never error-detail or the gating questions", () => {
    const steps = getApplicableSteps({
      submitterType: "public",
      administrationError: null,
      adverseEventOccurred: null,
    });
    expect(steps).toContain("adverse-event");
    expect(steps).not.toContain("error-detail");
    expect(steps).not.toContain("administration-error");
    expect(steps).not.toContain("adverse-event-occurred");
  });
});

describe("isStepUnlocked", () => {
  it("locks downstream steps until an HCP answers both gating questions", () => {
    const bothUnanswered: BranchingState = {
      submitterType: "hcp",
      administrationError: null,
      adverseEventOccurred: null,
    };
    expect(isStepUnlocked("about-you", bothUnanswered)).toBe(false);

    const bothAnswered: BranchingState = {
      submitterType: "hcp",
      administrationError: false,
      adverseEventOccurred: true,
    };
    expect(isStepUnlocked("about-you", bothAnswered)).toBe(true);
  });

  it("before-you-start is unlocked as soon as submitterType is chosen, before the gating questions", () => {
    const state: BranchingState = {
      submitterType: "hcp",
      administrationError: null,
      adverseEventOccurred: null,
    };
    expect(isStepUnlocked("before-you-start", state)).toBe(true);
  });

  it("public reporters never see the gating questions as unlocked", () => {
    const state: BranchingState = {
      submitterType: "public",
      administrationError: null,
      adverseEventOccurred: null,
    };
    expect(isStepUnlocked("administration-error", state)).toBe(false);
    expect(isStepUnlocked("about-you", state)).toBe(true);
  });
});
