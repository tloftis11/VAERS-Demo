import { Router } from "express";
import { prisma } from "../db.js";
import {
  getApplicableSteps,
  validateStep,
  checkCrossFieldRules,
  type BranchingState,
  type StepId,
  type SubmitterType,
  type ValidationFinding,
} from "../rules.js";
import { isLikelyDuplicate } from "../services/duplicateHeuristic.js";
import {
  requestVerificationCode,
  verifyCode,
  createFollowUpAccessToken,
  verifyFollowUpAccessToken,
} from "../services/followUpAccess.js";
import { generateDraftToken, hashDraftToken, requireDraftToken } from "../services/draftTokens.js";

export const reportsRouter = Router();

/** Age at vaccination, derived from date of birth + vaccination date rather
 * than trusting a manually-typed number that could disagree with either. */
function computeAge(dobStr: string, atDateStr: string): { years: number; months: number } {
  const dob = new Date(dobStr);
  const at = new Date(atDateStr);
  let years = at.getFullYear() - dob.getFullYear();
  let months = at.getMonth() - dob.getMonth();
  if (at.getDate() < dob.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) {
    // Shouldn't happen given the live "vaccination can't precede birth"
    // check on the Vaccine step, but never report a negative age.
    return { years: 0, months: 0 };
  }
  return { years, months };
}

function branchingStateFromReport(report: {
  submitterType: string | null;
  administrationError: boolean | null;
  adverseEventOccurred: boolean | null;
}): BranchingState {
  return {
    submitterType: report.submitterType as SubmitterType | null,
    administrationError: report.administrationError,
    adverseEventOccurred: report.adverseEventOccurred,
  };
}

async function serializeReport(reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      submitter: true,
      patient: true,
      vaccine: {
        include: {
          additionalVaccines: { orderBy: { sortOrder: "asc" } },
          priorVaccines: { orderBy: { sortOrder: "asc" } },
        },
      },
      adverseEvent: true,
      errorDetail: true,
      attachments: true,
      followUpNotes: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!report) return null;

  return {
    id: report.id,
    status: report.status,
    submitterType: report.submitterType,
    administrationError: report.administrationError,
    adverseEventOccurred: report.adverseEventOccurred,
    duplicateFlag: report.duplicateFlag,
    submittedAt: report.submittedAt,
    aboutYou: report.submitter
      ? {
          contactName: report.submitter.contactName ?? "",
          contactEmail: report.submitter.contactEmail ?? "",
          // Never persisted (see reports.ts's write path and
          // aboutYouSchema) — pre-filled from the already-saved, already-
          // confirmed address so a returning visitor isn't forced to
          // retype it on every reload; changing contactEmail without
          // updating this still re-triggers the mismatch check.
          contactEmailConfirm: report.submitter.contactEmail ?? "",
          contactPhone: report.submitter.contactPhone ?? "",
          relationship: report.submitter.relationship ?? "",
          relationshipOther: report.submitter.relationshipOther ?? "",
          mailingStreet: report.submitter.mailingStreet ?? "",
          mailingCity: report.submitter.mailingCity ?? "",
          mailingState: report.submitter.mailingState ?? "",
          mailingZip: report.submitter.mailingZip ?? "",
          bestContactName: report.submitter.bestContactName ?? "",
          bestContactPhone: report.submitter.bestContactPhone ?? "",
        }
      : null,
    patient: report.patient
      ? {
          patientFirstName: report.patient.firstName ?? "",
          patientLastName: report.patient.lastName ?? "",
          patientDateOfBirth: report.patient.dateOfBirth ?? "",
          dateOfBirthUnknown: report.patient.dateOfBirthUnknown,
          patientSex: report.patient.sex ?? "",
          ageYears: report.patient.ageYears ?? "",
          ageMonths: report.patient.ageMonths ?? "",
          patientStreet: report.patient.street ?? "",
          patientCity: report.patient.city ?? "",
          patientState: report.patient.state ?? "",
          patientCounty: report.patient.county ?? "",
          patientZip: report.patient.zip ?? "",
          patientPhone: report.patient.phone ?? "",
          patientEmail: report.patient.email ?? "",
          // Never persisted (same pattern as aboutYou.contactEmailConfirm) —
          // pre-filled from the already-confirmed saved address.
          patientEmailConfirm: report.patient.email ?? "",
          pregnant: report.patient.pregnant ?? "",
          pregnancyDetails: report.patient.pregnancyDetails ?? "",
          medicationsAtVaccination: report.patient.medicationsAtVaccination ?? "",
          allergies: report.patient.allergies ?? "",
          recentIllnesses: report.patient.recentIllnesses ?? "",
          chronicConditions: report.patient.chronicConditions ?? "",
          patientRace: report.patient.race ? (JSON.parse(report.patient.race) as string[]) : [],
          patientRaceOther: report.patient.raceOther ?? "",
          patientEthnicity: report.patient.ethnicity ?? "",
        }
      : null,
    vaccine: report.vaccine
      ? {
          vaccineType: report.vaccine.vaccineType ?? "",
          vaccineTypeOther: report.vaccine.vaccineTypeOther ?? "",
          manufacturer: report.vaccine.manufacturer ?? "",
          lotNumber: report.vaccine.lotNumber ?? "",
          doseNumber: report.vaccine.doseNumber ?? "",
          administrationDate: report.vaccine.administrationDate ?? "",
          administrationTime: report.vaccine.administrationTime ?? "",
          route: report.vaccine.route ?? "",
          bodySite: report.vaccine.bodySite ?? "",
          bodySiteOther: report.vaccine.bodySiteOther ?? "",
          administeringFacility: report.vaccine.administeringFacility ?? "",
          facilityStreet: report.vaccine.facilityStreet ?? "",
          facilityCity: report.vaccine.facilityCity ?? "",
          facilityState: report.vaccine.facilityState ?? "",
          facilityZip: report.vaccine.facilityZip ?? "",
          facilityPhone: report.vaccine.facilityPhone ?? "",
          facilityFax: report.vaccine.facilityFax ?? "",
          facilityType: report.vaccine.facilityType ?? "",
          facilityTypeOther: report.vaccine.facilityTypeOther ?? "",
          otherVaccinesRecent: report.vaccine.otherVaccinesRecent ?? "",
          otherVaccinesSameVisit: report.vaccine.otherVaccinesSameVisit ?? "",
          additionalVaccines: report.vaccine.additionalVaccines.map((row) => ({
            vaccineType: row.vaccineType ?? "",
            vaccineTypeOther: row.vaccineTypeOther ?? "",
            manufacturer: row.manufacturer ?? "",
            lotNumber: row.lotNumber ?? "",
            route: row.route ?? "",
            bodySite: row.bodySite ?? "",
            bodySiteOther: row.bodySiteOther ?? "",
            doseNumber: row.doseNumber ?? "",
          })),
          priorVaccines: report.vaccine.priorVaccines.map((row) => ({
            vaccineType: row.vaccineType ?? "",
            vaccineTypeOther: row.vaccineTypeOther ?? "",
            manufacturer: row.manufacturer ?? "",
            lotNumber: row.lotNumber ?? "",
            route: row.route ?? "",
            bodySite: row.bodySite ?? "",
            bodySiteOther: row.bodySiteOther ?? "",
            doseNumber: row.doseNumber ?? "",
            administrationDate: row.administrationDate ?? "",
          })),
        }
      : null,
    adverseEvent: report.adverseEvent
      ? {
          onsetDate: report.adverseEvent.onsetDate ?? "",
          onsetTime: report.adverseEvent.onsetTime ?? "",
          description: report.adverseEvent.description ?? "",
          symptoms: report.adverseEvent.symptoms
            ? (JSON.parse(report.adverseEvent.symptoms) as string[])
            : [],
          symptomsOther: report.adverseEvent.symptomsOther ?? "",
          labResults: report.adverseEvent.labResults ?? "",
          recoveryStatus: report.adverseEvent.recoveryStatus ?? "",
          outcomes: report.adverseEvent.outcomes
            ? (JSON.parse(report.adverseEvent.outcomes) as string[])
            : [],
          hospitalizationDays: report.adverseEvent.hospitalizationDays ?? "",
          hospitalName: report.adverseEvent.hospitalName ?? "",
          hospitalCity: report.adverseEvent.hospitalCity ?? "",
          hospitalState: report.adverseEvent.hospitalState ?? "",
          dateOfDeath: report.adverseEvent.dateOfDeath ?? "",
          treatmentGiven: report.adverseEvent.treatmentGiven ?? "",
          clinicalCourseNotes: report.adverseEvent.clinicalCourseNotes ?? "",
          previousAdverseEvent: report.adverseEvent.previousAdverseEvent ?? "",
          previousAdverseEventDetails: report.adverseEvent.previousAdverseEventDetails ?? "",
        }
      : null,
    errorDetail: report.errorDetail
      ? {
          errorType: report.errorDetail.errorType ?? "",
          errorTypeOther: report.errorDetail.errorTypeOther ?? "",
          errorDescription: report.errorDetail.errorDescription ?? "",
          errorDiscoveredDate: report.errorDetail.errorDiscoveredDate ?? "",
          correctiveActionTaken: report.errorDetail.correctiveActionTaken ?? "",
        }
      : null,
    documents: {
      supplementalNotes: report.supplementalNotes ?? "",
    },
    attachments: report.attachments.map((a) => ({
      id: a.id,
      originalFilename: a.originalFilename,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      uploadedAt: a.uploadedAt,
      isFollowUp: a.isFollowUp,
    })),
    followUpNotes: report.followUpNotes.map((n) => ({
      id: n.id,
      note: n.note,
      createdAt: n.createdAt,
    })),
  };
}

reportsRouter.post("/", async (_req, res) => {
  const draftToken = generateDraftToken();
  const report = await prisma.report.create({ data: { draftTokenHash: hashDraftToken(draftToken) } });
  // A brand-new report has no sub-records yet, so its serialized shape is
  // entirely knowable without a query — skip serializeReport()'s heavy
  // multi-relation re-fetch (submitter/patient/vaccine+rows/adverseEvent/
  // errorDetail/attachments/followUpNotes) for what's otherwise a second
  // round trip to confirm everything is null/empty.
  res.status(201).json({
    id: report.id,
    status: report.status,
    // Returned exactly once, here — never again by any other route (GET
    // re-fetches never include it, matching the "only a hash server-side"
    // rule). The client is responsible for holding onto it from this point on.
    draftToken,
    submitterType: null,
    administrationError: null,
    adverseEventOccurred: null,
    duplicateFlag: report.duplicateFlag,
    submittedAt: null,
    aboutYou: null,
    patient: null,
    vaccine: null,
    adverseEvent: null,
    errorDetail: null,
    documents: { supplementalNotes: "" },
    attachments: [],
    followUpNotes: [],
  });
});

reportsRouter.get("/:id", async (req, res) => {
  const existing = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Report not found" });
  if (!requireDraftToken(req, res, existing)) return;
  const serialized = await serializeReport(req.params.id);
  if (!serialized) return res.status(404).json({ error: "Report not found" });
  res.json(serialized);
});

// PHI-free existence/status check — lets the follow-up lookup form confirm
// a reference number and route (draft vs. submitted) without the full
// report ever reaching the browser before identity is verified.
reportsRouter.get("/:id/status", async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!report) return res.status(404).json({ error: "Report not found" });
  res.json({ id: report.id, status: report.status });
});

reportsRouter.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { step, data } = req.body as { step: StepId; data: Record<string, unknown> };

  const existing = await prisma.report.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Report not found" });
  if (existing.status === "submitted") {
    return res.status(409).json({ error: "Report has already been submitted" });
  }
  if (!requireDraftToken(req, res, existing)) return;

  const submitterTypeForValidation: SubmitterType =
    step === "submitter-type"
      ? ((data as { submitterType?: SubmitterType }).submitterType ?? "public")
      : ((existing.submitterType as SubmitterType | null) ?? "public");

  const result = validateStep(step, submitterTypeForValidation, data);
  if (!result.success) {
    return res.status(400).json({ errors: result.errors });
  }
  const validated = result.data as Record<string, any>;

  switch (step) {
    case "submitter-type":
      await prisma.report.update({
        where: { id },
        data: { submitterType: validated.submitterType },
      });
      break;
    case "administration-error":
      await prisma.report.update({
        where: { id },
        data: { administrationError: validated.administrationError },
      });
      // Answering "No" here means the error-detail section no longer
      // applies — clear it any time this is saved as false (not just on a
      // true→false change) so a stale record from an earlier "Yes" can
      // never linger and show up on Review under a branch that's no
      // longer selected. A no-op if nothing was ever saved there.
      if (validated.administrationError === false) {
        await prisma.errorDetail.deleteMany({ where: { reportId: id } });
      }
      break;
    case "adverse-event-occurred":
      await prisma.report.update({
        where: { id },
        data: { adverseEventOccurred: validated.adverseEventOccurred },
      });
      // Same rationale as administration-error above — a stale adverseEvent
      // record from an earlier "Yes" must not survive a later "No".
      if (validated.adverseEventOccurred === false) {
        await prisma.adverseEvent.deleteMany({ where: { reportId: id } });
      }
      break;
    case "about-you": {
      // Read before the upsert below overwrites it — this is the
      // relationship as it stood *before* this save, needed to detect a
      // self → not-self correction (see below).
      const previousSubmitter = await prisma.submitter.findUnique({
        where: { reportId: id },
        select: { relationship: true },
      });
      // contactEmailConfirm only exists to catch a mistyped address at
      // submit time (see shared/src/schemas.ts) — it's never a real
      // Submitter column, so it must never reach the Prisma write.
      const { contactEmailConfirm: _contactEmailConfirm, ...submitterData } = validated;
      await prisma.submitter.upsert({
        where: { reportId: id },
        create: { reportId: id, ...submitterData },
        update: { ...submitterData },
      });
      // Reporting for "myself" means the contact IS the patient — carry the
      // name over so it isn't re-typed a step later. Only fills a blank
      // patient name (first-time only), so it never clobbers a manual edit
      // made after this point.
      if (validated.relationship === "self") {
        const existingPatient = await prisma.patient.findUnique({ where: { reportId: id } });
        if (!existingPatient?.firstName) {
          const fullName = String(validated.contactName ?? "").trim();
          const spaceIdx = fullName.indexOf(" ");
          const firstName = spaceIdx === -1 ? fullName : fullName.slice(0, spaceIdx);
          const lastName = spaceIdx === -1 ? "" : fullName.slice(spaceIdx + 1).trim();
          if (firstName) {
            await prisma.patient.upsert({
              where: { reportId: id },
              create: { reportId: id, firstName, lastName },
              update: { firstName, lastName },
            });
          }
        }
        // Reporting for yourself means the contact email IS the patient's
        // email — carry it over so it isn't retyped from scratch a few
        // questions later (they still have to type it again on the
        // confirmation question, same as they did here). Only fills a
        // blank patient email, so it never clobbers a manual edit made
        // after this point, and never applies to a caregiver/HCP report
        // where the patient is a different person from the reporter.
        if (!existingPatient?.email && validated.contactEmail) {
          await prisma.patient.upsert({
            where: { reportId: id },
            create: { reportId: id, email: String(validated.contactEmail) },
            update: { email: String(validated.contactEmail) },
          });
        }
      } else if (previousSubmitter?.relationship === "self") {
        // The reporter just corrected "myself" to someone else (e.g. the
        // patient-step age-plausibility flag's "change who's filling this
        // out" redirect) — whatever name/email got carried over above while
        // we still thought this was a self-report was the *reporter's* own
        // info, not necessarily the real patient's, and it's never been
        // through the Patient step's own confirmation for this (different)
        // patient. Clear it so that step asks fresh instead of silently
        // keeping the previous person's info attributed to someone else.
        await prisma.patient.updateMany({
          where: { reportId: id },
          data: { firstName: null, lastName: null, email: null },
        });
      }
      break;
    }
    case "patient": {
      const dobUnknown = Boolean(validated.dateOfBirthUnknown);
      const patientData = {
        firstName: validated.patientFirstName,
        lastName: validated.patientLastName,
        dateOfBirth: dobUnknown ? null : validated.patientDateOfBirth || null,
        dateOfBirthUnknown: dobUnknown,
        sex: validated.patientSex,
        // When DOB is known, age is derived once the vaccination date is
        // available (below, and from the "vaccine" case) rather than
        // trusted from the client — only the DOB-unknown fallback path
        // takes a directly-entered age.
        ageYears: dobUnknown ? (validated.ageYears === "" ? null : validated.ageYears) : null,
        ageMonths: dobUnknown ? (validated.ageMonths === "" ? null : validated.ageMonths) : null,
        street: validated.patientStreet || null,
        city: validated.patientCity || null,
        state: validated.patientState || null,
        county: validated.patientCounty || null,
        zip: validated.patientZip || null,
        phone: validated.patientPhone || null,
        // patientEmailConfirm only exists to catch a mistyped address at
        // submit time (see shared/src/schemas.ts) — never a real column.
        email: validated.patientEmail || null,
        pregnant: validated.pregnant || null,
        pregnancyDetails: validated.pregnancyDetails || null,
        medicationsAtVaccination: validated.medicationsAtVaccination || null,
        allergies: validated.allergies || null,
        recentIllnesses: validated.recentIllnesses || null,
        chronicConditions: validated.chronicConditions || null,
        race: JSON.stringify(validated.patientRace ?? []),
        raceOther: validated.patientRaceOther || null,
        ethnicity: validated.patientEthnicity || null,
      };
      await prisma.patient.upsert({
        where: { reportId: id },
        create: { reportId: id, ...patientData },
        update: patientData,
      });
      if (!dobUnknown && patientData.dateOfBirth) {
        const vaccine = await prisma.vaccineAdministration.findUnique({ where: { reportId: id } });
        if (vaccine?.administrationDate) {
          const age = computeAge(patientData.dateOfBirth, vaccine.administrationDate);
          await prisma.patient.update({
            where: { reportId: id },
            data: { ageYears: age.years, ageMonths: age.months },
          });
        }
      }
      break;
    }
    case "vaccine": {
      // additionalVaccines/priorVaccines are relations (repeatable bundled
      // rows), not scalar columns — can't just spread them into the flat
      // upsert. Simplest correct approach for "however many rows the
      // reporter has right now": replace the whole set every save.
      const { additionalVaccines, priorVaccines, ...scalarFields } = validated as Record<string, unknown> & {
        additionalVaccines?: Record<string, unknown>[];
        priorVaccines?: Record<string, unknown>[];
      };
      const additionalVaccinesData = (additionalVaccines ?? []).map((row, i) => ({ ...row, sortOrder: i }));
      const priorVaccinesData = (priorVaccines ?? []).map((row, i) => ({ ...row, sortOrder: i }));
      await prisma.vaccineAdministration.upsert({
        where: { reportId: id },
        create: {
          reportId: id,
          ...scalarFields,
          additionalVaccines: { create: additionalVaccinesData },
          priorVaccines: { create: priorVaccinesData },
        },
        update: {
          ...scalarFields,
          additionalVaccines: { deleteMany: {}, create: additionalVaccinesData },
          priorVaccines: { deleteMany: {}, create: priorVaccinesData },
        },
      });
      const patient = await prisma.patient.findUnique({ where: { reportId: id } });
      if (patient && !patient.dateOfBirthUnknown && patient.dateOfBirth && validated.administrationDate) {
        const age = computeAge(patient.dateOfBirth, validated.administrationDate);
        await prisma.patient.update({
          where: { reportId: id },
          data: { ageYears: age.years, ageMonths: age.months },
        });
      }
      break;
    }
    case "adverse-event": {
      // administrationError and adverseEventOccurred are independent
      // (PROV-002/003), so a report can have both an ErrorDetail and an
      // AdverseEvent row — this never deletes the other table.
      const adverseEventData = {
        onsetDate: validated.onsetDate,
        onsetTime: validated.onsetTime || null,
        description: validated.description,
        symptoms: JSON.stringify(validated.symptoms ?? []),
        symptomsOther: validated.symptomsOther || null,
        labResults: validated.labResults || null,
        recoveryStatus: validated.recoveryStatus || null,
        outcomes: JSON.stringify(validated.outcomes ?? []),
        hospitalizationDays: validated.hospitalizationDays === "" ? null : validated.hospitalizationDays,
        hospitalName: validated.hospitalName || null,
        hospitalCity: validated.hospitalCity || null,
        hospitalState: validated.hospitalState || null,
        dateOfDeath: validated.dateOfDeath || null,
        treatmentGiven: validated.treatmentGiven || null,
        clinicalCourseNotes: validated.clinicalCourseNotes || null,
        previousAdverseEvent: validated.previousAdverseEvent || null,
        previousAdverseEventDetails: validated.previousAdverseEventDetails || null,
      };
      await prisma.adverseEvent.upsert({
        where: { reportId: id },
        create: { reportId: id, ...adverseEventData },
        update: adverseEventData,
      });
      break;
    }
    case "error-detail":
      await prisma.errorDetail.upsert({
        where: { reportId: id },
        create: { reportId: id, ...validated },
        update: { ...validated },
      });
      break;
    case "documents":
      await prisma.report.update({
        where: { id },
        data: { supplementalNotes: validated.supplementalNotes || null },
      });
      break;
    default:
      break;
  }

  res.json(await serializeReport(id));
});

reportsRouter.post("/:id/submit", async (req, res) => {
  const { id } = req.params;
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      submitter: true,
      patient: true,
      vaccine: { include: { additionalVaccines: true, priorVaccines: true } },
      adverseEvent: true,
      errorDetail: true,
    },
  });
  if (!report) return res.status(404).json({ error: "Report not found" });
  if (report.status === "submitted") {
    return res.status(409).json({ error: "Report has already been submitted" });
  }
  if (!requireDraftToken(req, res, report)) return;
  if (!report.submitterType) {
    return res.status(400).json({ error: "Submitter type is required before submitting" });
  }

  const state = branchingStateFromReport(report);
  const gatingSteps: StepId[] = [
    "submitter-type",
    "before-you-start",
    "administration-error",
    "adverse-event-occurred",
    "documents",
    "review",
  ];
  const steps = getApplicableSteps(state).filter((s) => !gatingSteps.includes(s));
  const submitterType = report.submitterType as SubmitterType;
  const incompleteSteps: StepId[] = [];

  for (const step of steps) {
    const slice = sliceForStep(step, report);
    if (!slice) {
      incompleteSteps.push(step);
      continue;
    }
    const result = validateStep(step, submitterType, slice);
    if (!result.success) incompleteSteps.push(step);
  }

  if (incompleteSteps.length > 0) {
    return res.status(400).json({ error: "Report is incomplete", incompleteSteps });
  }

  // VAL-001/003: deterministic cross-field checks zod's per-step schemas
  // can't express (they only ever see one step's fields at a time). ERROR
  // severity blocks submission, same as a missing required field would.
  const crossFieldFindings: ValidationFinding[] = checkCrossFieldRules({
    submitterType: report.submitterType as "public" | "hcp" | null,
    administrationError: report.administrationError,
    adverseEventOccurred: report.adverseEventOccurred,
    vaccine: report.vaccine ? { administrationDate: report.vaccine.administrationDate ?? "" } : null,
    patient: report.patient ? { dateOfBirth: report.patient.dateOfBirth ?? "" } : null,
    adverseEvent: report.adverseEvent
      ? {
          onsetDate: report.adverseEvent.onsetDate ?? "",
          dateOfDeath: report.adverseEvent.dateOfDeath ?? "",
          outcomes: report.adverseEvent.outcomes ? (JSON.parse(report.adverseEvent.outcomes) as string[]) : [],
          hospitalizationDays: report.adverseEvent.hospitalizationDays ?? "",
        }
      : null,
    errorDetail: report.errorDetail
      ? { errorDiscoveredDate: report.errorDetail.errorDiscoveredDate ?? "" }
      : null,
    aboutYou: report.submitter ? { relationship: report.submitter.relationship ?? "" } : null,
  });
  const blockingFindings = crossFieldFindings.filter((f) => f.severity === "ERROR");
  if (blockingFindings.length > 0) {
    return res.status(400).json({ error: "Report has validation errors", findings: blockingFindings });
  }

  const duplicateFlag = await isLikelyDuplicate(id);

  await prisma.report.update({
    where: { id },
    data: { status: "submitted", submittedAt: new Date(), duplicateFlag },
  });

  res.json({ id, status: "submitted", duplicateFlag });
});

// Identity gate for follow-up (PRS#7/PWS §3.4 PHI handling): a submitted
// report's contact email must be confirmed, then a one-time code proven,
// before an access token scoped to this one report is issued. Delivery of
// the code is mocked below (devCode is handed straight back) since this
// prototype has no email provider wired up — everything else here is the
// real check.
reportsRouter.post("/:id/request-code", async (req, res) => {
  const { id } = req.params;
  const email = String((req.body as { email?: unknown })?.email ?? "").trim().toLowerCase();
  if (!email) return res.status(400).json({ error: "Email is required" });

  const report = await prisma.report.findUnique({ where: { id }, include: { submitter: true } });
  if (!report || report.status !== "submitted") {
    return res.status(404).json({ error: "Report not found" });
  }
  const onFile = (report.submitter?.contactEmail ?? "").trim().toLowerCase();
  if (!onFile || onFile !== email) {
    return res.status(403).json({ error: "That email doesn't match our records for this report" });
  }

  const devCode = requestVerificationCode(id);
  res.json({ sent: true, devCode });
});

reportsRouter.post("/:id/verify-code", async (req, res) => {
  const { id } = req.params;
  const code = String((req.body as { code?: unknown })?.code ?? "").trim();
  if (!code) return res.status(400).json({ error: "Code is required" });

  if (!verifyCode(id, code)) {
    return res.status(401).json({ error: "That code is incorrect or has expired" });
  }
  res.json({ accessToken: createFollowUpAccessToken(id) });
});

function requireFollowUpAccess(req: { params: { id: string }; headers: Record<string, unknown> }): boolean {
  const token = String(req.headers["x-followup-token"] ?? "");
  return verifyFollowUpAccessToken(token, req.params.id);
}

reportsRouter.get("/:id/follow-up", async (req, res) => {
  const { id } = req.params;
  if (!requireFollowUpAccess(req)) {
    return res.status(401).json({ error: "Verification required" });
  }
  const serialized = await serializeReport(id);
  if (!serialized || serialized.status !== "submitted") {
    return res.status(404).json({ error: "Report not found" });
  }
  res.json(serialized);
});

reportsRouter.post("/:id/follow-up-notes", async (req, res) => {
  const { id } = req.params;
  if (!requireFollowUpAccess(req)) {
    return res.status(401).json({ error: "Verification required" });
  }
  const note = String((req.body as { note?: unknown })?.note ?? "").trim();
  if (!note) return res.status(400).json({ error: "Note text is required" });

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return res.status(404).json({ error: "Report not found" });
  if (report.status !== "submitted") {
    return res.status(409).json({ error: "Follow-up notes can only be added to a submitted report" });
  }

  await prisma.followUpNote.create({ data: { reportId: id, note } });
  res.status(201).json(await serializeReport(id));
});

function sliceForStep(step: StepId, report: any): Record<string, unknown> | null {
  switch (step) {
    case "about-you":
      return report.submitter
        ? {
            contactName: report.submitter.contactName ?? "",
            contactEmail: report.submitter.contactEmail ?? "",
            contactEmailConfirm: report.submitter.contactEmail ?? "",
            contactPhone: report.submitter.contactPhone ?? "",
            relationship: report.submitter.relationship ?? "",
            relationshipOther: report.submitter.relationshipOther ?? "",
            mailingStreet: report.submitter.mailingStreet ?? "",
            mailingCity: report.submitter.mailingCity ?? "",
            mailingState: report.submitter.mailingState ?? "",
            mailingZip: report.submitter.mailingZip ?? "",
            bestContactName: report.submitter.bestContactName ?? "",
          bestContactPhone: report.submitter.bestContactPhone ?? "",
          }
        : null;
    case "patient":
      return report.patient
        ? {
            patientFirstName: report.patient.firstName ?? "",
            patientLastName: report.patient.lastName ?? "",
            patientDateOfBirth: report.patient.dateOfBirth ?? "",
            dateOfBirthUnknown: report.patient.dateOfBirthUnknown,
            patientSex: report.patient.sex ?? "",
            ageYears: report.patient.ageYears ?? "",
            ageMonths: report.patient.ageMonths ?? "",
            patientStreet: report.patient.street ?? "",
            patientCity: report.patient.city ?? "",
            patientState: report.patient.state ?? "",
            patientCounty: report.patient.county ?? "",
            patientZip: report.patient.zip ?? "",
            patientPhone: report.patient.phone ?? "",
            patientEmail: report.patient.email ?? "",
            patientEmailConfirm: report.patient.email ?? "",
            pregnant: report.patient.pregnant ?? "",
            pregnancyDetails: report.patient.pregnancyDetails ?? "",
            medicationsAtVaccination: report.patient.medicationsAtVaccination ?? "",
            allergies: report.patient.allergies ?? "",
            recentIllnesses: report.patient.recentIllnesses ?? "",
            chronicConditions: report.patient.chronicConditions ?? "",
            patientRace: report.patient.race ? JSON.parse(report.patient.race) : [],
            patientRaceOther: report.patient.raceOther ?? "",
            patientEthnicity: report.patient.ethnicity ?? "",
          }
        : null;
    case "vaccine":
      return report.vaccine
        ? {
            vaccineType: report.vaccine.vaccineType ?? "",
            vaccineTypeOther: report.vaccine.vaccineTypeOther ?? "",
            manufacturer: report.vaccine.manufacturer ?? "",
            lotNumber: report.vaccine.lotNumber ?? "",
            doseNumber: report.vaccine.doseNumber ?? "",
            administrationDate: report.vaccine.administrationDate ?? "",
            administrationTime: report.vaccine.administrationTime ?? "",
            route: report.vaccine.route ?? "",
            bodySite: report.vaccine.bodySite ?? "",
            bodySiteOther: report.vaccine.bodySiteOther ?? "",
            administeringFacility: report.vaccine.administeringFacility ?? "",
            facilityStreet: report.vaccine.facilityStreet ?? "",
            facilityCity: report.vaccine.facilityCity ?? "",
            facilityState: report.vaccine.facilityState ?? "",
            facilityZip: report.vaccine.facilityZip ?? "",
            facilityPhone: report.vaccine.facilityPhone ?? "",
            facilityFax: report.vaccine.facilityFax ?? "",
            facilityType: report.vaccine.facilityType ?? "",
            facilityTypeOther: report.vaccine.facilityTypeOther ?? "",
            otherVaccinesRecent: report.vaccine.otherVaccinesRecent ?? "",
            otherVaccinesSameVisit: report.vaccine.otherVaccinesSameVisit ?? "",
            additionalVaccines: (report.vaccine.additionalVaccines ?? []).map((row: any) => ({
              vaccineType: row.vaccineType ?? "",
              vaccineTypeOther: row.vaccineTypeOther ?? "",
              manufacturer: row.manufacturer ?? "",
              lotNumber: row.lotNumber ?? "",
              route: row.route ?? "",
              bodySite: row.bodySite ?? "",
              bodySiteOther: row.bodySiteOther ?? "",
              doseNumber: row.doseNumber ?? "",
            })),
            priorVaccines: (report.vaccine.priorVaccines ?? []).map((row: any) => ({
              vaccineType: row.vaccineType ?? "",
              vaccineTypeOther: row.vaccineTypeOther ?? "",
              manufacturer: row.manufacturer ?? "",
              lotNumber: row.lotNumber ?? "",
              route: row.route ?? "",
              bodySite: row.bodySite ?? "",
              bodySiteOther: row.bodySiteOther ?? "",
              doseNumber: row.doseNumber ?? "",
              administrationDate: row.administrationDate ?? "",
            })),
          }
        : null;
    case "adverse-event":
      return report.adverseEvent
        ? {
            onsetDate: report.adverseEvent.onsetDate ?? "",
            onsetTime: report.adverseEvent.onsetTime ?? "",
            description: report.adverseEvent.description ?? "",
            symptoms: report.adverseEvent.symptoms ? JSON.parse(report.adverseEvent.symptoms) : [],
            symptomsOther: report.adverseEvent.symptomsOther ?? "",
            labResults: report.adverseEvent.labResults ?? "",
            recoveryStatus: report.adverseEvent.recoveryStatus ?? "",
            outcomes: report.adverseEvent.outcomes ? JSON.parse(report.adverseEvent.outcomes) : [],
            hospitalizationDays: report.adverseEvent.hospitalizationDays ?? "",
            hospitalName: report.adverseEvent.hospitalName ?? "",
            hospitalCity: report.adverseEvent.hospitalCity ?? "",
            hospitalState: report.adverseEvent.hospitalState ?? "",
            dateOfDeath: report.adverseEvent.dateOfDeath ?? "",
            treatmentGiven: report.adverseEvent.treatmentGiven ?? "",
            clinicalCourseNotes: report.adverseEvent.clinicalCourseNotes ?? "",
            previousAdverseEvent: report.adverseEvent.previousAdverseEvent ?? "",
            previousAdverseEventDetails: report.adverseEvent.previousAdverseEventDetails ?? "",
          }
        : null;
    case "error-detail":
      return report.errorDetail
        ? {
            errorType: report.errorDetail.errorType ?? "",
            errorTypeOther: report.errorDetail.errorTypeOther ?? "",
            errorDescription: report.errorDetail.errorDescription ?? "",
            errorDiscoveredDate: report.errorDetail.errorDiscoveredDate ?? "",
            correctiveActionTaken: report.errorDetail.correctiveActionTaken ?? "",
          }
        : null;
    default:
      return null;
  }
}
