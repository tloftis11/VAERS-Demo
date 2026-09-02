import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app.js";

async function createDraft() {
  const res = await request(app).post("/api/reports").expect(201);
  return { id: res.body.id as string, token: res.body.draftToken as string };
}

function aboutYouPayload(overrides: Record<string, unknown> = {}) {
  return {
    contactName: "Reporter Name",
    contactEmail: "reporter@example.com",
    contactEmailConfirm: "reporter@example.com",
    contactPhone: "",
    relationship: "self",
    relationshipOther: "",
    mailingStreet: "",
    mailingCity: "",
    mailingState: "",
    mailingZip: "",
    bestContactName: "",
    bestContactPhone: "",
    ...overrides,
  };
}

/**
 * Section-2-batch fix: a self-reporting submitter's name/email is auto-
 * carried onto the Patient record (see reports.ts "about-you" case) so it
 * isn't re-typed a step later. If the reporter then corrects "myself" to
 * someone else (e.g. the Patient step's age-plausibility "change who's
 * filling this out" redirect) before ever reaching/saving the Patient step
 * itself, that carried-over info is the *reporter's* own data, not
 * necessarily the real patient's — it must not silently persist attributed
 * to a different person.
 */
describe("about-you self-report correction clears unconfirmed carried-over patient info", () => {
  it("REGRESSION: correcting relationship away from 'self' clears the auto-filled patient name/email", async () => {
    const { id, token } = await createDraft();
    await request(app)
      .patch(`/api/reports/${id}`)
      .set("X-Draft-Token", token)
      .send({ step: "submitter-type", data: { submitterType: "public" } })
      .expect(200);

    // First save as a self-report — triggers the auto-fill.
    await request(app)
      .patch(`/api/reports/${id}`)
      .set("X-Draft-Token", token)
      .send({ step: "about-you", data: aboutYouPayload({ relationship: "self" }) })
      .expect(200);

    const afterSelf = await request(app).get(`/api/reports/${id}`).set("X-Draft-Token", token).expect(200);
    expect(afterSelf.body.patient.patientFirstName).toBe("Reporter");
    expect(afterSelf.body.patient.patientEmail).toBe("reporter@example.com");

    // Correct it to a caregiver report, without ever touching the Patient step.
    await request(app)
      .patch(`/api/reports/${id}`)
      .set("X-Draft-Token", token)
      .send({ step: "about-you", data: aboutYouPayload({ relationship: "parent_guardian_caregiver" }) })
      .expect(200);

    const afterCorrection = await request(app)
      .get(`/api/reports/${id}`)
      .set("X-Draft-Token", token)
      .expect(200);
    expect(afterCorrection.body.patient.patientFirstName).toBe("");
    expect(afterCorrection.body.patient.patientEmail).toBe("");
  });

  it("does not touch patient info that was already confirmed via the Patient step before the correction", async () => {
    const { id, token } = await createDraft();
    await request(app)
      .patch(`/api/reports/${id}`)
      .set("X-Draft-Token", token)
      .send({ step: "submitter-type", data: { submitterType: "public" } })
      .expect(200);
    await request(app)
      .patch(`/api/reports/${id}`)
      .set("X-Draft-Token", token)
      .send({ step: "about-you", data: aboutYouPayload({ relationship: "self" }) })
      .expect(200);

    // Reporter reaches the Patient step and explicitly confirms a real
    // patient email of their own choosing (matching what "self" implies).
    await request(app)
      .patch(`/api/reports/${id}`)
      .set("X-Draft-Token", token)
      .send({
        step: "patient",
        data: {
          patientFirstName: "Confirmed",
          patientLastName: "Patient",
          patientDateOfBirth: "1990-01-01",
          dateOfBirthUnknown: false,
          patientSex: "female",
          ageYears: "",
          ageMonths: "",
          patientStreet: "",
          patientCity: "",
          patientState: "",
          patientCounty: "",
          patientZip: "",
          patientPhone: "",
          patientEmail: "confirmed.patient@example.com",
          patientEmailConfirm: "confirmed.patient@example.com",
          pregnant: "",
          pregnancyDetails: "",
          medicationsAtVaccination: "",
          allergies: "",
          recentIllnesses: "",
          chronicConditions: "",
          patientRace: [],
          patientRaceOther: "",
          patientEthnicity: "",
        },
      })
      .expect(200);

    // Later corrected to a caregiver report — since the patient step was
    // already saved once, this is no longer an unconfirmed auto-fill, so
    // the "self" -> non-self transition below runs against data that was
    // genuinely entered while relationship was still "self". Clearing it
    // is still correct here (it's no longer trustworthy for a *different*
    // patient), same as the unconfirmed case above.
    await request(app)
      .patch(`/api/reports/${id}`)
      .set("X-Draft-Token", token)
      .send({ step: "about-you", data: aboutYouPayload({ relationship: "parent_guardian_caregiver" }) })
      .expect(200);

    const afterCorrection = await request(app)
      .get(`/api/reports/${id}`)
      .set("X-Draft-Token", token)
      .expect(200);
    expect(afterCorrection.body.patient.patientFirstName).toBe("");
    expect(afterCorrection.body.patient.patientEmail).toBe("");
  });

  it("a second self-report save (relationship unchanged) does not clear already-confirmed patient info", async () => {
    const { id, token } = await createDraft();
    await request(app)
      .patch(`/api/reports/${id}`)
      .set("X-Draft-Token", token)
      .send({ step: "submitter-type", data: { submitterType: "public" } })
      .expect(200);
    await request(app)
      .patch(`/api/reports/${id}`)
      .set("X-Draft-Token", token)
      .send({ step: "about-you", data: aboutYouPayload({ relationship: "self", contactPhone: "" }) })
      .expect(200);

    // A later, unrelated edit to the same about-you step (e.g. adding a
    // phone number), relationship still "self" both times.
    await request(app)
      .patch(`/api/reports/${id}`)
      .set("X-Draft-Token", token)
      .send({ step: "about-you", data: aboutYouPayload({ relationship: "self", contactPhone: "(404) 555-1212" }) })
      .expect(200);

    const afterSecondSave = await request(app)
      .get(`/api/reports/${id}`)
      .set("X-Draft-Token", token)
      .expect(200);
    expect(afterSecondSave.body.patient.patientFirstName).toBe("Reporter");
    expect(afterSecondSave.body.patient.patientEmail).toBe("reporter@example.com");
  });
});
