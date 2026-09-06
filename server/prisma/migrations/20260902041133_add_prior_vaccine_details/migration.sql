/*
  Warnings:

  - You are about to drop the column `vaccineName` on the `PriorVaccine` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PriorVaccine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vaccineId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "vaccineType" TEXT,
    "vaccineTypeOther" TEXT,
    "manufacturer" TEXT,
    "lotNumber" TEXT,
    "route" TEXT,
    "bodySite" TEXT,
    "doseNumber" TEXT,
    "administrationDate" TEXT,
    CONSTRAINT "PriorVaccine_vaccineId_fkey" FOREIGN KEY ("vaccineId") REFERENCES "VaccineAdministration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PriorVaccine" ("administrationDate", "id", "sortOrder", "vaccineId") SELECT "administrationDate", "id", "sortOrder", "vaccineId" FROM "PriorVaccine";
DROP TABLE "PriorVaccine";
ALTER TABLE "new_PriorVaccine" RENAME TO "PriorVaccine";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
