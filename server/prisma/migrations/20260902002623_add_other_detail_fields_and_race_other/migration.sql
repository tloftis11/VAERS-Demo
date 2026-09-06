-- AlterTable
ALTER TABLE "ErrorDetail" ADD COLUMN "errorTypeOther" TEXT;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN "raceOther" TEXT;

-- AlterTable
ALTER TABLE "Submitter" ADD COLUMN "relationshipOther" TEXT;

-- AlterTable
ALTER TABLE "VaccineAdministration" ADD COLUMN "facilityTypeOther" TEXT;
