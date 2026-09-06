import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app.js";

async function createDraft() {
  const res = await request(app).post("/api/reports").expect(201);
  return { id: res.body.id as string, token: res.body.draftToken as string };
}

function patch(id: string, token: string, step: string, data: Record<string, unknown>) {
  return request(app).patch(`/api/reports/${id}`).set("X-Draft-Token", token).send({ step, data });
}

/**
 * If an HCP reporter enters adverse-event or administration-error details
 * and later changes that branch's gating answer to "No," the saved detail
 * record must not survive — otherwise Review can display information from
 * a branch that's no longer selected (see reports.ts's "administration-
 * error"/"adverse-event-occurred" PATCH cases).
 */
describe("changing an HCP gating answer to 'No' clears the corresponding detail record", () => {
  it("REGRESSION: clears errorDetail when administrationError flips to false", async () => {
    const { id, token } = await createDraft();
    await patch(id, token, "submitter-type", { submitterType: "hcp" }).expect(200);
    await patch(id, token, "administration-error", { administrationError: true }).expect(200);
    await patch(id, token, "adverse-event-occurred", { adverseEventOccurred: true }).expect(200);
    await patch(id, token, "error-detail", {
      errorType: "wrong_dose",
      errorTypeOther: "",
      errorDescription: "Gave a double dose by mistake.",
      errorDiscoveredDate: "2026-01-02",
      correctiveActionTaken: "Notified the patient and documented the error.",
    }).expect(200);

    const beforeFlip = await request(app).get(`/api/reports/${id}`).set("X-Draft-Token", token).expect(200);
    expect(beforeFlip.body.errorDetail).not.toBeNull();
    expect(beforeFlip.body.errorDetail.errorDescription).toBe("Gave a double dose by mistake.");

    await patch(id, token, "administration-error", { administrationError: false }).expect(200);

    const afterFlip = await request(app).get(`/api/reports/${id}`).set("X-Draft-Token", token).expect(200);
    expect(afterFlip.body.errorDetail).toBeNull();
  });

  it("REGRESSION: clears adverseEvent when adverseEventOccurred flips to false", async () => {
    const { id, token } = await createDraft();
    await patch(id, token, "submitter-type", { submitterType: "hcp" }).expect(200);
    await patch(id, token, "administration-error", { administrationError: false }).expect(200);
    await patch(id, token, "adverse-event-occurred", { adverseEventOccurred: true }).expect(200);
    await patch(id, token, "adverse-event", {
      onsetDate: "2026-01-02",
      onsetTime: "",
      description: "Patient developed a rash.",
      symptoms: [],
      symptomsOther: "",
      labResults: "",
      recoveryStatus: "",
      outcomes: [],
      hospitalizationDays: "",
      hospitalName: "",
      hospitalCity: "",
      hospitalState: "",
      dateOfDeath: "",
      treatmentGiven: "",
      clinicalCourseNotes: "",
      previousAdverseEvent: "",
      previousAdverseEventDetails: "",
    }).expect(200);

    const beforeFlip = await request(app).get(`/api/reports/${id}`).set("X-Draft-Token", token).expect(200);
    expect(beforeFlip.body.adverseEvent).not.toBeNull();
    expect(beforeFlip.body.adverseEvent.description).toBe("Patient developed a rash.");

    await patch(id, token, "adverse-event-occurred", { adverseEventOccurred: false }).expect(200);

    const afterFlip = await request(app).get(`/api/reports/${id}`).set("X-Draft-Token", token).expect(200);
    expect(afterFlip.body.adverseEvent).toBeNull();
  });

  it("does not clear errorDetail when administrationError is saved as true again (no false in between)", async () => {
    const { id, token } = await createDraft();
    await patch(id, token, "submitter-type", { submitterType: "hcp" }).expect(200);
    await patch(id, token, "administration-error", { administrationError: true }).expect(200);
    await patch(id, token, "adverse-event-occurred", { adverseEventOccurred: false }).expect(200);
    await patch(id, token, "error-detail", {
      errorType: "wrong_vaccine",
      errorTypeOther: "",
      errorDescription: "Wrong vaccine administered.",
      errorDiscoveredDate: "2026-01-02",
      correctiveActionTaken: "Reported to the clinic lead.",
    }).expect(200);

    // Re-saving the same question with the same "true" answer (e.g. the
    // reporter revisits the question without changing it) must not wipe
    // out the detail that's still perfectly valid for this branch.
    await patch(id, token, "administration-error", { administrationError: true }).expect(200);

    const after = await request(app).get(`/api/reports/${id}`).set("X-Draft-Token", token).expect(200);
    expect(after.body.errorDetail).not.toBeNull();
    expect(after.body.errorDetail.errorDescription).toBe("Wrong vaccine administered.");
  });
});
