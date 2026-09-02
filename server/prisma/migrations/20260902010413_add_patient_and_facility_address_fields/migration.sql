-- AlterTable
ALTER TABLE "Patient" ADD COLUMN "city" TEXT;
ALTER TABLE "Patient" ADD COLUMN "county" TEXT;
ALTER TABLE "Patient" ADD COLUMN "email" TEXT;
ALTER TABLE "Patient" ADD COLUMN "phone" TEXT;
ALTER TABLE "Patient" ADD COLUMN "street" TEXT;
ALTER TABLE "Patient" ADD COLUMN "zip" TEXT;

-- AlterTable
ALTER TABLE "VaccineAdministration" ADD COLUMN "facilityCity" TEXT;
ALTER TABLE "VaccineAdministration" ADD COLUMN "facilityFax" TEXT;
ALTER TABLE "VaccineAdministration" ADD COLUMN "facilityPhone" TEXT;
ALTER TABLE "VaccineAdministration" ADD COLUMN "facilityState" TEXT;
ALTER TABLE "VaccineAdministration" ADD COLUMN "facilityStreet" TEXT;
ALTER TABLE "VaccineAdministration" ADD COLUMN "facilityZip" TEXT;
