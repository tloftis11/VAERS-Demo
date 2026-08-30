-- AlterTable
ALTER TABLE "Submitter" ADD COLUMN "bestContactInfo" TEXT;
ALTER TABLE "Submitter" ADD COLUMN "mailingAddress" TEXT;

-- AlterTable
ALTER TABLE "VaccineAdministration" ADD COLUMN "vaccine2BodySite" TEXT;
ALTER TABLE "VaccineAdministration" ADD COLUMN "vaccine2DoseNumber" TEXT;
ALTER TABLE "VaccineAdministration" ADD COLUMN "vaccine2LotNumber" TEXT;
ALTER TABLE "VaccineAdministration" ADD COLUMN "vaccine2Manufacturer" TEXT;
ALTER TABLE "VaccineAdministration" ADD COLUMN "vaccine2Route" TEXT;
ALTER TABLE "VaccineAdministration" ADD COLUMN "vaccine2Type" TEXT;
