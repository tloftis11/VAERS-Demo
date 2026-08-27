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

export const reportsRouter = Router();

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
      vaccine: true,
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
          contactPhone: report.submitter.contactPhone ?? "",
          relationship: report.submitter.relationship ?? "",
        }
      : null,
    patient: report.patient
      ? {
          patientFirstName: report.patient.firstName ?? "",
          patientLastName: report.patient.lastName ?? "",
          patientDateOfBirth: report.patient.dateOfBirth ?? "",
          patientSex: report.patient.sex ?? "",
          ageYears: report.patient.ageYears ?? "",
          ageMonths: report.patient.ageMonths ?? "",
          patientState: report.patient.state ?? "",
          pregnant: report.patient.pregnant ?? "",
          medicationsAtVaccination: report.patient.medicationsAtVaccination ?? "",
          allergies: report.patient.allergies ?? "",
          recentIllnesses: report.patient.recentIllnesses ?? "",
          chronicConditions: report.patient.chronicConditions ?? "",
          patientRace: report.patient.race ? (JSON.parse(report.patient.race) as string[]) : [],
          patientEthnicity: report.patient.ethnicity ?? "",
        }
      : null,
    vaccine: report.vaccine
      ? {
          vaccineType: report.vaccine.vaccineType ?? "",
          manufacturer: report.vaccine.manufacturer ?? "",
          lotNumber: report.vaccine.lotNumber ?? "",
          doseNumber: report.vaccine.doseNumber ?? "",
          administrationDate: report.vaccine.administrationDate ?? "",
          administrationTime: report.vaccine.administrationTime ?? "",
          route: report.vaccine.route ?? "",
          bodySite: report.vaccine.bodySite ?? "",
          administeringFacility: report.vaccine.administeringFacility ?? "",
          facilityType: report.vaccine.facilityType ?? "",
          otherVaccinesRecent: report.vaccine.otherVaccinesRecent ?? "",
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
  const report = await prisma.report.create({ data: {} });
  res.status(201).json(await serializeReport(report.id));
});

reportsRouter.get("/:id", async (req, res) => {
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
      break;
    case "adverse-event-occurred":
      await prisma.report.update({
        where: { id },
        data: { adverseEventOccurred: validated.adverseEventOccurred },
      });
      break;
    case "about-you": {
      await prisma.submitter.upsert({
        where: { reportId: id },
        create: { reportId: id, ...validated },
        update: { ...validated },
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
      }
      break;
    }
    case "patient": {
      const patientData = {
        firstName: validated.patientFirstName,
        lastName: validated.patientLastName,
        dateOfBirth: validated.patientDateOfBirth,
        sex: validated.patientSex,
        ageYears: validated.ageYears ?? null,
        ageMonths: validated.ageMonths === "" ? null : validated.ageMonths,
        state: validated.patientState || null,
        pregnant: validated.pregnant || null,
        medicationsAtVaccination: validated.medicationsAtVaccination || null,
        allergies: validated.allergies || null,
        recentIllnesses: validated.recentIllnesses || null,
        chronicConditions: validated.chronicConditions || null,
        race: JSON.stringify(validated.patientRace ?? []),
        ethnicity: validated.patientEthnicity || null,
      };
      await prisma.patient.upsert({
        where: { reportId: id },
        create: { reportId: id, ...patientData },
        update: patientData,
      });
      break;
    }
    case "vaccine":
      await prisma.vaccineAdministration.upsert({
        where: { reportId: id },
        create: { reportId: id, ...validated },
        update: { ...validated },
      });
      break;
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
    include: { submitter: true, patient: true, vaccine: true, adverseEvent: true, errorDetail: true },
  });
  if (!report) return res.status(404).json({ error: "Report not found" });
  if (report.status === "submitted") {
    return res.status(409).json({ error: "Report has already been submitted" });
  }
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
    vaccine: report.vaccine ? { administrationDate: report.vaccine.administrationDate ?? "" } : null,
    adverseEvent: report.adverseEvent ? { onsetDate: report.adverseEvent.onsetDate ?? "" } : null,
    errorDetail: report.errorDetail
      ? { errorDiscoveredDate: report.errorDetail.errorDiscoveredDate ?? "" }
      : null,
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
            contactPhone: report.submitter.contactPhone ?? "",
            relationship: report.submitter.relationship ?? "",
          }
        : null;
    case "patient":
      return report.patient
        ? {
            patientFirstName: report.patient.firstName ?? "",
            patientLastName: report.patient.lastName ?? "",
            patientDateOfBirth: report.patient.dateOfBirth ?? "",
            patientSex: report.patient.sex ?? "",
            ageYears: report.patient.ageYears ?? "",
            ageMonths: report.patient.ageMonths ?? "",
            patientState: report.patient.state ?? "",
            pregnant: report.patient.pregnant ?? "",
            medicationsAtVaccination: report.patient.medicationsAtVaccination ?? "",
            allergies: report.patient.allergies ?? "",
            recentIllnesses: report.patient.recentIllnesses ?? "",
            chronicConditions: report.patient.chronicConditions ?? "",
            patientRace: report.patient.race ? JSON.parse(report.patient.race) : [],
            patientEthnicity: report.patient.ethnicity ?? "",
          }
        : null;
    case "vaccine":
      return report.vaccine
        ? {
            vaccineType: report.vaccine.vaccineType ?? "",
            manufacturer: report.vaccine.manufacturer ?? "",
            lotNumber: report.vaccine.lotNumber ?? "",
            doseNumber: report.vaccine.doseNumber ?? "",
            administrationDate: report.vaccine.administrationDate ?? "",
            administrationTime: report.vaccine.administrationTime ?? "",
            route: report.vaccine.route ?? "",
            bodySite: report.vaccine.bodySite ?? "",
            administeringFacility: report.vaccine.administeringFacility ?? "",
            facilityType: report.vaccine.facilityType ?? "",
            otherVaccinesRecent: report.vaccine.otherVaccinesRecent ?? "",
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
            errorDescription: report.errorDetail.errorDescription ?? "",
            errorDiscoveredDate: report.errorDetail.errorDiscoveredDate ?? "",
            correctiveActionTaken: report.errorDetail.correctiveActionTaken ?? "",
          }
        : null;
    default:
      return null;
  }
}
