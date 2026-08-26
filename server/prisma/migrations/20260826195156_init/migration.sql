-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submitterType" TEXT,
    "administrationError" BOOLEAN,
    "adverseEventOccurred" BOOLEAN,
    "supplementalNotes" TEXT,
    "duplicateFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "submittedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Submitter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "relationship" TEXT,
    CONSTRAINT "Submitter_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "dateOfBirth" TEXT,
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

-- CreateTable
CREATE TABLE "VaccineAdministration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "vaccineType" TEXT,
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
    CONSTRAINT "VaccineAdministration_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdverseEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "onsetDate" TEXT,
    "onsetTime" TEXT,
    "description" TEXT,
    "symptoms" TEXT,
    "labResults" TEXT,
    "recoveryStatus" TEXT,
    "outcomes" TEXT,
    "hospitalizationDays" INTEGER,
    "hospitalName" TEXT,
    "hospitalCity" TEXT,
    "hospitalState" TEXT,
    "dateOfDeath" TEXT,
    "treatmentGiven" TEXT,
    "clinicalCourseNotes" TEXT,
    "previousAdverseEvent" TEXT,
    "previousAdverseEventDetails" TEXT,
    CONSTRAINT "AdverseEvent_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ErrorDetail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "errorType" TEXT,
    "errorDescription" TEXT,
    "errorDiscoveredDate" TEXT,
    "correctiveActionTaken" TEXT,
    CONSTRAINT "ErrorDetail_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storedFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFollowUp" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Attachment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FollowUpNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FollowUpNote_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "reportId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SurveyResponse_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Submitter_reportId_key" ON "Submitter"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_reportId_key" ON "Patient"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "VaccineAdministration_reportId_key" ON "VaccineAdministration"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "AdverseEvent_reportId_key" ON "AdverseEvent"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "ErrorDetail_reportId_key" ON "ErrorDetail"("reportId");
