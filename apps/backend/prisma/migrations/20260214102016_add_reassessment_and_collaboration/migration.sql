-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN "collaborators" TEXT;
ALTER TABLE "Assessment" ADD COLUMN "previousAssessmentId" TEXT;

-- AlterTable
ALTER TABLE "Response" ADD COLUMN "claimedBy" TEXT;
