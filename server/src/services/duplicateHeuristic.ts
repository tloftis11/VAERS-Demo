/**
 * Duplicate-submission heuristic (design doc §5.3): "flags (does not block)
 * likely-duplicate reports for CDC review, supporting data-quality without
 * adding friction to a first-time reporter."
 *
 * Two layers: an exact-match check (same patient identity + vaccine + date),
 * and — only when that finds nothing — a Claude-assisted semantic check
 * across same-patient/vaccine reports with a different administration date
 * or wording, to catch re-reports of the same real-world event described
 * differently (a parent and a clinic both reporting the same visit, etc.).
 */
import { prisma } from "../db.js";
import { checkSemanticDuplicate } from "./claudeClient.js";

/** A report can have both an AdverseEvent and an ErrorDetail narrative (PROV-002/003) — combine them when both exist rather than picking one arbitrarily. */
function combinedNarrative(report: {
  adverseEvent?: { description: string | null } | null;
  errorDetail?: { errorDescription: string | null } | null;
}): string | null {
  const parts = [report.adverseEvent?.description, report.errorDetail?.errorDescription].filter(
    (p): p is string => Boolean(p)
  );
  return parts.length > 0 ? parts.join(" / ") : null;
}

export async function isLikelyDuplicate(reportId: string): Promise<boolean> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { patient: true, vaccine: true, adverseEvent: true, errorDetail: true },
  });

  if (!report?.patient || !report.vaccine) return false;
  const { firstName, lastName, dateOfBirth } = report.patient;
  const { vaccineType, administrationDate } = report.vaccine;
  if (!firstName || !lastName || !dateOfBirth || !vaccineType || !administrationDate) {
    return false;
  }

  const exactMatch = await prisma.report.findFirst({
    where: {
      id: { not: reportId },
      patient: { firstName, lastName, dateOfBirth },
      vaccine: { vaccineType, administrationDate },
    },
  });
  if (exactMatch) return true;

  return isLikelySemanticDuplicate(reportId, {
    lastName,
    dateOfBirth,
    vaccineType,
    administrationDate,
  });
}

async function isLikelySemanticDuplicate(
  reportId: string,
  patientVaccine: { lastName: string; dateOfBirth: string; vaccineType: string; administrationDate: string }
): Promise<boolean> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { adverseEvent: true, errorDetail: true },
  });
  const description = report ? combinedNarrative(report) : null;
  if (!description) return false;

  const candidates = await prisma.report.findMany({
    where: {
      id: { not: reportId },
      patient: { lastName: patientVaccine.lastName, dateOfBirth: patientVaccine.dateOfBirth },
      vaccine: { vaccineType: patientVaccine.vaccineType },
    },
    include: { vaccine: true, adverseEvent: true, errorDetail: true },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  const candidateInputs = candidates
    .map((c) => {
      const desc = combinedNarrative(c);
      if (!desc || !c.vaccine?.vaccineType || !c.vaccine.administrationDate) return null;
      return {
        id: c.id,
        description: desc,
        vaccineType: c.vaccine.vaccineType,
        administrationDate: c.vaccine.administrationDate,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  if (candidateInputs.length === 0) return false;

  try {
    const result = await checkSemanticDuplicate(
      {
        description,
        vaccineType: patientVaccine.vaccineType,
        administrationDate: patientVaccine.administrationDate,
      },
      candidateInputs
    );
    return result.isDuplicate;
  } catch (err) {
    console.error("Semantic duplicate check failed, falling back to exact-match only:", err);
    return false;
  }
}
