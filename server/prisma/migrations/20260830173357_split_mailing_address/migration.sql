/*
  Warnings:

  - You are about to drop the column `mailingAddress` on the `Submitter` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Submitter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "relationship" TEXT,
    "mailingStreet" TEXT,
    "mailingCity" TEXT,
    "mailingState" TEXT,
    "mailingZip" TEXT,
    "bestContactInfo" TEXT,
    CONSTRAINT "Submitter_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Submitter" ("bestContactInfo", "contactEmail", "contactName", "contactPhone", "id", "relationship", "reportId") SELECT "bestContactInfo", "contactEmail", "contactName", "contactPhone", "id", "relationship", "reportId" FROM "Submitter";
DROP TABLE "Submitter";
ALTER TABLE "new_Submitter" RENAME TO "Submitter";
CREATE UNIQUE INDEX "Submitter_reportId_key" ON "Submitter"("reportId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
