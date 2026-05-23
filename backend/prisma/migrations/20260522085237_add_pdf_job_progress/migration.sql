-- AlterTable
ALTER TABLE "pdf_jobs" ADD COLUMN     "progressDone" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "progressTotal" INTEGER NOT NULL DEFAULT 0;
