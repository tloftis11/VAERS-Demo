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
    "vaccine2Given" BOOLEAN NOT NULL DEFAULT false,
    "vaccine2Type" TEXT,
    "vaccine2Manufacturer" TEXT,
    "vaccine2LotNumber" TEXT,
    "vaccine2Route" TEXT,
    "vaccine2BodySite" TEXT,
    "vaccine2DoseNumber" TEXT,
    CONSTRAINT "VaccineAdministration_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_VaccineAdministration" ("administeringFacility", "administrationDate", "administrationTime", "bodySite", "doseNumber", "facilityType", "id", "lotNumber", "manufacturer", "otherVaccinesRecent", "otherVaccinesSameVisit", "reportId", "route", "vaccine2BodySite", "vaccine2DoseNumber", "vaccine2LotNumber", "vaccine2Manufacturer", "vaccine2Route", "vaccine2Type", "vaccineType", "vaccineTypeOther") SELECT "administeringFacility", "administrationDate", "administrationTime", "bodySite", "doseNumber", "facilityType", "id", "lotNumber", "manufacturer", "otherVaccinesRecent", "otherVaccinesSameVisit", "reportId", "route", "vaccine2BodySite", "vaccine2DoseNumber", "vaccine2LotNumber", "vaccine2Manufacturer", "vaccine2Route", "vaccine2Type", "vaccineType", "vaccineTypeOther" FROM "VaccineAdministration";
DROP TABLE "VaccineAdministration";
ALTER TABLE "new_VaccineAdministration" RENAME TO "VaccineAdministration";
CREATE UNIQUE INDEX "VaccineAdministration_reportId_key" ON "VaccineAdministration"("reportId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
