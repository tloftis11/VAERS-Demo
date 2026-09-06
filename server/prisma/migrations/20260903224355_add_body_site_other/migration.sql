-- AlterTable
ALTER TABLE "AdditionalVaccine" ADD COLUMN "bodySiteOther" TEXT;

-- AlterTable
ALTER TABLE "PriorVaccine" ADD COLUMN "bodySiteOther" TEXT;

-- AlterTable
ALTER TABLE "VaccineAdministration" ADD COLUMN "bodySiteOther" TEXT;
