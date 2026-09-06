import { describe, expect, it } from "vitest";
import { furthestCompletedStep } from "./reportProgress";
import type { ClientReport } from "./api/client";

function baseReport(overrides: Partial<ClientReport> = {}): ClientReport {
  return {
    id: "r1",
    status: "draft",
    submitterType: null,
    administrationError: null,
    adverseEventOccurred: null,
    duplicateFlag: false,
    submittedAt: null,
    aboutYou: null,
    patient: null,
    vaccine: null,
    adverseEvent: null,
    errorDetail: null,
    documents: { supplementalNotes: "" },
    attachments: [],
    followUpNotes: [],
    ...overrides,
  };
}

describe("furthestCompletedStep — how far the reporter has actually gotten", () => {
  it("stops at the very first step when nothing has been saved yet", () => {
    expect(furthestCompletedStep(baseReport())).toBe("submitter-type");
  });

  it("advances past each required step once its data is present", () => {
    const report = baseReport({
      submitterType: "public",
      aboutYou: {} as ClientReport["aboutYou"],
      patient: {} as ClientReport["patient"],
    });
    expect(furthestCompletedStep(report)).toBe("vaccine");
  });

  it("REGRESSION: unlike firstIncompleteStep, treats 'documents' as reachable once everything required is done — never stops there", () => {
    const report = baseReport({
      submitterType: "public",
      aboutYou: {} as ClientReport["aboutYou"],
      patient: {} as ClientReport["patient"],
      vaccine: {} as ClientReport["vaccine"],
      adverseEvent: {} as ClientReport["adverseEvent"],
      // documents has no required field — no signal to check here at all,
      // and that must not block reaching "review".
    });
    expect(furthestCompletedStep(report)).toBe("review");
  });

  it("an HCP report still needs the two gating questions answered before counting as complete", () => {
    const gated = baseReport({ submitterType: "hcp" });
    expect(furthestCompletedStep(gated)).toBe("administration-error");

    const ungated = baseReport({
      submitterType: "hcp",
      administrationError: false,
      adverseEventOccurred: true,
      aboutYou: {} as ClientReport["aboutYou"],
    });
    expect(furthestCompletedStep(ungated)).toBe("patient");
  });
});
