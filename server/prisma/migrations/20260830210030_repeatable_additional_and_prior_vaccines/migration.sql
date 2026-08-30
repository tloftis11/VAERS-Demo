/*
  Warnings:

  - You are about to drop the column `otherVaccinesRecentGiven` on the `VaccineAdministration` table. All the data in the column will be lost.
  - You are about to drop the column `vaccine2BodySite` on the `VaccineAdministration` table. All the data in the column will be lost.
  - You are about to drop the column `vaccine2DoseNumber` on the `VaccineAdministration` table. All the data in the column will be lost.
  - You are about to drop the column `vaccine2Given` on the `VaccineAdministration` table. All the data in the column will be lost.
  - You are about to drop the column `vaccine2LotNumber` on the `VaccineAdministration` table. All the data in the column will be lost.
  - You are about to drop the column `vaccine2Manufacturer` on the `VaccineAdministration` table. All the data in the column will be lost.
  - You are about to drop the column `vaccine2Route` on the `VaccineAdministration` table. All the data in the column will be lost.
  - You are about to drop the column `vaccine2Type` on the `VaccineAdministration` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "AdditionalVaccine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vaccineId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "vaccineType" TEXT,
    "manufacturer" TEXT,
    "lotNumber" TEXT,
    "route" TEXT,
    "bodySite" TEXT,
    "doseNumber" TEXT,
    CONSTRAINT "AdditionalVaccine_vaccineId_fkey" FOREIGN KEY ("vaccineId") REFERENCES "VaccineAdministration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriorVaccine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vaccineId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "vaccineName" TEXT,
    "administrationDate" TEXT,
    CONSTRAINT "PriorVaccine_vaccineId_fkey" FOREIGN KEY ("vaccineId") REFERENCES "VaccineAdministration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VaccineAdministration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "vaccineType" TEXT,
    "vaccineTypeOther" TEXT,
    "manufacturer" TEXT,
    "lotNumber" TEXT,
    "doseNumber" TEXT,
    "administrationDate" TEXT,
    "administrationTime" TEXT,
    "route" TEXT,
    "bodySite" TEXT,
    "administeringFacility" TEXT,
    "facilityType" TEXT,
    "otherVaccinesRecent" TEXT,
    "otherVaccinesSameVisit" TEXT,
    CONSTRAINT "VaccineAdministration_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_VaccineAdministration" ("administeringFacility", "administrationDate", "administrationTime", "bodySite", "doseNumber", "facilityType", "id", "lotNumber", "manufacturer", "otherVaccinesRecent", "otherVaccinesSameVisit", "reportId", "route", "vaccineType", "vaccineTypeOther") SELECT "administeringFacility", "administrationDate", "administrationTime", "bodySite", "doseNumber", "facilityType", "id", "lotNumber", "manufacturer", "otherVaccinesRecent", "otherVaccinesSameVisit", "reportId", "route", "vaccineType", "vaccineTypeOther" FROM "VaccineAdministration";
DROP TABLE "VaccineAdministration";
ALTER TABLE "new_VaccineAdministration" RENAME TO "VaccineAdministration";
CREATE UNIQUE INDEX "VaccineAdministration_reportId_key" ON "VaccineAdministration"("reportId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
