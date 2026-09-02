import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app.js";

async function createDraft() {
  const res = await request(app).post("/api/reports").expect(201);
  return { id: res.body.id as string, token: res.body.draftToken as string };
}

describe("draft capability token — protects draft read/write and attachment ops", () => {
  it("GET /:id rejects a missing token", async () => {
    const { id } = await createDraft();
    await request(app).get(`/api/reports/${id}`).expect(401);
  });

  it("GET /:id rejects an invalid token", async () => {
    const { id } = await createDraft();
    await request(app).get(`/api/reports/${id}`).set("X-Draft-Token", "not-a-real-token").expect(401);
  });

  it("GET /:id rejects another draft's real token (cross-draft access)", async () => {
    const { id } = await createDraft();
    const other = await createDraft();
    await request(app).get(`/api/reports/${id}`).set("X-Draft-Token", other.token).expect(401);
  });

  it("GET /:id succeeds with the correct token", async () => {
    const { id, token } = await createDraft();
    const res = await request(app).get(`/api/reports/${id}`).set("X-Draft-Token", token).expect(200);
    expect(res.body.id).toBe(id);
  });

  it("PATCH /:id rejects a missing or mismatched token", async () => {
    const { id } = await createDraft();
    const other = await createDraft();
    await request(app)
      .patch(`/api/reports/${id}`)
      .send({ step: "submitter-type", data: { submitterType: "public" } })
      .expect(401);
    await request(app)
      .patch(`/api/reports/${id}`)
      .set("X-Draft-Token", other.token)
      .send({ step: "submitter-type", data: { submitterType: "public" } })
      .expect(401);
  });

  it("PATCH /:id succeeds with the correct token", async () => {
    const { id, token } = await createDraft();
    await request(app)
      .patch(`/api/reports/${id}`)
      .set("X-Draft-Token", token)
      .send({ step: "submitter-type", data: { submitterType: "public" } })
      .expect(200);
  });

  it("POST /reports/:reportId/attachments rejects a missing or mismatched token", async () => {
    const { id } = await createDraft();
    const other = await createDraft();
    await request(app)
      .post(`/api/reports/${id}/attachments`)
      .attach("file", Buffer.from("test content"), { filename: "test.pdf", contentType: "application/pdf" })
      .expect(401);
    await request(app)
      .post(`/api/reports/${id}/attachments`)
      .set("X-Draft-Token", other.token)
      .attach("file", Buffer.from("test content"), { filename: "test.pdf", contentType: "application/pdf" })
      .expect(401);
  });

  it("POST /reports/:reportId/attachments succeeds with the correct token", async () => {
    const { id, token } = await createDraft();
    const res = await request(app)
      .post(`/api/reports/${id}/attachments`)
      .set("X-Draft-Token", token)
      .attach("file", Buffer.from("test content"), { filename: "test.pdf", contentType: "application/pdf" })
      .expect(201);
    expect(res.body.originalFilename).toBe("test.pdf");
  });

  it("DELETE /attachments/:attachmentId rejects a missing or mismatched token", async () => {
    const { id, token } = await createDraft();
    const other = await createDraft();
    const upload = await request(app)
      .post(`/api/reports/${id}/attachments`)
      .set("X-Draft-Token", token)
      .attach("file", Buffer.from("test content"), { filename: "test.pdf", contentType: "application/pdf" })
      .expect(201);

    await request(app).delete(`/api/attachments/${upload.body.id}`).expect(401);
    await request(app)
      .delete(`/api/attachments/${upload.body.id}`)
      .set("X-Draft-Token", other.token)
      .expect(401);
  });

  it("DELETE /attachments/:attachmentId succeeds with the correct token", async () => {
    const { id, token } = await createDraft();
    const upload = await request(app)
      .post(`/api/reports/${id}/attachments`)
      .set("X-Draft-Token", token)
      .attach("file", Buffer.from("test content"), { filename: "test.pdf", contentType: "application/pdf" })
      .expect(201);

    await request(app)
      .delete(`/api/attachments/${upload.body.id}`)
      .set("X-Draft-Token", token)
      .expect(204);
  });

  it("GET /reports/:reportId/attachments (list) rejects a missing or mismatched token", async () => {
    const { id } = await createDraft();
    const other = await createDraft();
    await request(app).get(`/api/reports/${id}/attachments`).expect(401);
    await request(app)
      .get(`/api/reports/${id}/attachments`)
      .set("X-Draft-Token", other.token)
      .expect(401);
  });

  it("POST /:id/submit rejects a missing or mismatched token", async () => {
    const { id } = await createDraft();
    const other = await createDraft();
    await request(app).post(`/api/reports/${id}/submit`).expect(401);
    await request(app).post(`/api/reports/${id}/submit`).set("X-Draft-Token", other.token).expect(401);
  });

  it("REGRESSION: GET /:id/status stays token-free (must remain checkable pre-identity)", async () => {
    const { id } = await createDraft();
    const res = await request(app).get(`/api/reports/${id}/status`).expect(200);
    expect(res.body.status).toBe("draft");
  });

  it("a submitted report's GET /:id no longer needs a token (confirmation page must survive a refresh with no token in hand)", async () => {
    const { id, token } = await createDraft();
    // Minimal path to a submittable state.
    await request(app)
      .patch(`/api/reports/${id}`)
      .set("X-Draft-Token", token)
      .send({ step: "submitter-type", data: { submitterType: "public" } })
      .expect(200);
    await request(app)
      .patch(`/api/reports/${id}`)
      .set("X-Draft-Token", token)
      .send({
        step: "about-you",
        data: {
          contactName: "Test Reporter",
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
        },
      })
      .expect(200);
    await request(app)
      .patch(`/api/reports/${id}`)
      .set("X-Draft-Token", token)
      .send({
        step: "patient",
        data: {
          patientFirstName: "Test",
          patientLastName: "Reporter",
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
          patientEmail: "",
          patientEmailConfirm: "",
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
    await request(app)
      .patch(`/api/reports/${id}`)
      .set("X-Draft-Token", token)
      .send({
        step: "vaccine",
        data: {
          vaccineType: "covid19",
          vaccineTypeOther: "",
          doseNumber: "",
          administrationDate: "2026-01-01",
          administrationTime: "",
          manufacturer: "",
          lotNumber: "",
          route: "",
          bodySite: "",
          administeringFacility: "",
          facilityStreet: "",
          facilityCity: "",
          facilityState: "",
          facilityZip: "",
          facilityPhone: "",
          facilityFax: "",
          facilityType: "",
          facilityTypeOther: "",
          otherVaccinesRecent: "",
          otherVaccinesSameVisit: "",
          additionalVaccines: [],
          priorVaccines: [],
        },
      })
      .expect(200);

    await request(app)
      .patch(`/api/reports/${id}`)
      .set("X-Draft-Token", token)
      .send({
        step: "adverse-event",
        data: {
          onsetDate: "2026-01-02",
          onsetTime: "",
          description: "Patient developed a mild rash after vaccination.",
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
        },
      })
      .expect(200);

    const submitted = await request(app)
      .post(`/api/reports/${id}/submit`)
      .set("X-Draft-Token", token)
      .expect(200);
    expect(submitted.body.status).toBe("submitted");

    // No token at all — simulating a page refresh after the client has
    // already cleared it per the "remove only after confirmation loads" rule.
    const afterSubmit = await request(app).get(`/api/reports/${id}`).expect(200);
    expect(afterSubmit.body.status).toBe("submitted");
  });
});
