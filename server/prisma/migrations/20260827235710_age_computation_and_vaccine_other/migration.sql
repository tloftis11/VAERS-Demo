-- AlterTable
ALTER TABLE "VaccineAdministration" ADD COLUMN "vaccineTypeOther" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "dateOfBirth" TEXT,
    "dateOfBirthUnknown" BOOLEAN NOT NULL DEFAULT false,
    "sex" TEXT,
    "ageYears" INTEGER,
    "ageMonths" INTEGER,
    "state" TEXT,
    "pregnant" TEXT,
    "medicationsAtVaccination" TEXT,
    "allergies" TEXT,
    "recentIllnesses" TEXT,
    "chronicConditions" TEXT,
    "race" TEXT,
    "ethnicity" TEXT,
    CONSTRAINT "Patient_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Patient" ("ageMonths", "ageYears", "allergies", "chronicConditions", "dateOfBirth", "ethnicity", "firstName", "id", "lastName", "medicationsAtVaccination", "pregnant", "race", "recentIllnesses", "reportId", "sex", "state") SELECT "ageMonths", "ageYears", "allergies", "chronicConditions", "dateOfBirth", "ethnicity", "firstName", "id", "lastName", "medicationsAtVaccination", "pregnant", "race", "recentIllnesses", "reportId", "sex", "state" FROM "Patient";
DROP TABLE "Patient";
ALTER TABLE "new_Patient" RENAME TO "Patient";
CREATE UNIQUE INDEX "Patient_reportId_key" ON "Patient"("reportId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
