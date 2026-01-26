-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "config" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "UserCompany" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;
