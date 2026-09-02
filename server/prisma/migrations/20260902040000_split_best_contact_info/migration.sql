/*
  Warnings:

  - You are about to drop the column `bestContactInfo` on the `Submitter` table. All the data in the column will be lost.

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
    "relationshipOther" TEXT,
    "mailingStreet" TEXT,
    "mailingCity" TEXT,
    "mailingState" TEXT,
    "mailingZip" TEXT,
    "bestContactName" TEXT,
    "bestContactPhone" TEXT,
    CONSTRAINT "Submitter_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Submitter" ("id", "reportId", "contactName", "contactEmail", "contactPhone", "relationship", "relationshipOther", "mailingStreet", "mailingCity", "mailingState", "mailingZip") SELECT "id", "reportId", "contactName", "contactEmail", "contactPhone", "relationship", "relationshipOther", "mailingStreet", "mailingCity", "mailingState", "mailingZip" FROM "Submitter";
DROP TABLE "Submitter";
ALTER TABLE "new_Submitter" RENAME TO "Submitter";
CREATE UNIQUE INDEX "Submitter_reportId_key" ON "Submitter"("reportId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
