import { Router } from "express";
import { prisma } from "../db.js";
import {
  getApplicableSteps,
  validateStep,
  type BranchingState,
  type StepId,
  type SubmitterType,
} from "../rules.js";
import { isLikelyDuplicate } from "../services/duplicateHeuristic.js";

export const reportsRouter = Router();

function branchingStateFromReport(report: {
  submitterType: string | null;
  reportCharacteristic: string | null;
}): BranchingState {
  return {
    submitterType: report.submitterType as SubmitterType | null,
    reportCharacteristic: report.reportCharacteristic as BranchingState["reportCharacteristic"],
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
    },
  });
  if (!report) return null;

  return {
    id: report.id,
    status: report.status,
    submitterType: report.submitterType,
    reportCharacteristic: report.reportCharacteristic,
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
          patientWeightKg: report.patient.weightKg ?? "",
          medicalRecordNumber: report.patient.medicalRecordNumber ?? "",
        }
      : null,
    vaccine: report.vaccine
      ? {
          vaccineType: report.vaccine.vaccineType ?? "",
          manufacturer: report.vaccine.manufacturer ?? "",
          lotNumber: report.vaccine.lotNumber ?? "",
          doseNumber: report.vaccine.doseNumber ?? "",
          administrationDate: report.vaccine.administrationDate ?? "",
          route: report.vaccine.route ?? "",
          bodySite: report.vaccine.bodySite ?? "",
          administeringFacility: report.vaccine.administeringFacility ?? "",
        }
      : null,
    adverseEvent: report.adverseEvent
      ? {
          onsetDate: report.adverseEvent.onsetDate ?? "",
          description: report.adverseEvent.description ?? "",
          outcomes: report.adverseEvent.outcomes
            ? (JSON.parse(report.adverseEvent.outcomes) as string[])
            : [],
          hospitalizationDates: report.adverseEvent.hospitalizationDates ?? "",
          treatmentGiven: report.adverseEvent.treatmentGiven ?? "",
          clinicalCourseNotes: report.adverseEvent.clinicalCourseNotes ?? "",
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
    case "report-characteristic":
      await prisma.report.update({
        where: { id },
        data: { reportCharacteristic: validated.reportCharacteristic },
      });
      break;
    case "about-you":
      await prisma.submitter.upsert({
        where: { reportId: id },
        create: { reportId: id, ...validated },
        update: { ...validated },
      });
      break;
    case "patient":
      await prisma.patient.upsert({
        where: { reportId: id },
        create: {
          reportId: id,
          firstName: validated.patientFirstName,
          lastName: validated.patientLastName,
          dateOfBirth: validated.patientDateOfBirth,
          sex: validated.patientSex,
          weightKg: validated.patientWeightKg || null,
          medicalRecordNumber: validated.medicalRecordNumber || null,
        },
        update: {
          firstName: validated.patientFirstName,
          lastName: validated.patientLastName,
          dateOfBirth: validated.patientDateOfBirth,
          sex: validated.patientSex,
          weightKg: validated.patientWeightKg || null,
          medicalRecordNumber: validated.medicalRecordNumber || null,
        },
      });
      break;
    case "vaccine":
      await prisma.vaccineAdministration.upsert({
        where: { reportId: id },
        create: { reportId: id, ...validated },
        update: { ...validated },
      });
      break;
    case "adverse-event":
      await prisma.errorDetail.deleteMany({ where: { reportId: id } });
      await prisma.adverseEvent.upsert({
        where: { reportId: id },
        create: {
          reportId: id,
          ...validated,
          outcomes: JSON.stringify(validated.outcomes ?? []),
        },
        update: {
          ...validated,
          outcomes: JSON.stringify(validated.outcomes ?? []),
        },
      });
      break;
    case "error-detail":
      await prisma.adverseEvent.deleteMany({ where: { reportId: id } });
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
  const steps = getApplicableSteps(state).filter(
    (s) => s !== "submitter-type" && s !== "report-characteristic" && s !== "documents" && s !== "review"
  );
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

  const duplicateFlag = await isLikelyDuplicate(id);

  await prisma.report.update({
    where: { id },
    data: { status: "submitted", submittedAt: new Date(), duplicateFlag },
  });

  res.json({ id, status: "submitted", duplicateFlag });
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
            patientWeightKg: report.patient.weightKg ?? "",
            medicalRecordNumber: report.patient.medicalRecordNumber ?? "",
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
            route: report.vaccine.route ?? "",
            bodySite: report.vaccine.bodySite ?? "",
            administeringFacility: report.vaccine.administeringFacility ?? "",
          }
        : null;
    case "adverse-event":
      return report.adverseEvent
        ? {
            onsetDate: report.adverseEvent.onsetDate ?? "",
            description: report.adverseEvent.description ?? "",
            outcomes: report.adverseEvent.outcomes ? JSON.parse(report.adverseEvent.outcomes) : [],
            hospitalizationDates: report.adverseEvent.hospitalizationDates ?? "",
            treatmentGiven: report.adverseEvent.treatmentGiven ?? "",
            clinicalCourseNotes: report.adverseEvent.clinicalCourseNotes ?? "",
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
