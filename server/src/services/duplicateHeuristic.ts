/**
 * Duplicate-submission heuristic (design doc §5.3): "flags (does not block)
 * likely-duplicate reports for CDC review, supporting data-quality without
 * adding friction to a first-time reporter."
 */
import { prisma } from "../db.js";

export async function isLikelyDuplicate(reportId: string): Promise<boolean> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { patient: true, vaccine: true },
  });

  if (!report?.patient || !report.vaccine) return false;
  const { firstName, lastName, dateOfBirth } = report.patient;
  const { vaccineType, administrationDate } = report.vaccine;
  if (!firstName || !lastName || !dateOfBirth || !vaccineType || !administrationDate) {
    return false;
  }

  const match = await prisma.report.findFirst({
    where: {
      id: { not: reportId },
      patient: { firstName, lastName, dateOfBirth },
      vaccine: { vaccineType, administrationDate },
    },
  });

  return match !== null;
}
