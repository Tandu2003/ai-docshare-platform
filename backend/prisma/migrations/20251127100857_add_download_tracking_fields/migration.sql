-- AlterEnum
ALTER TYPE "PointTxnReason" ADD VALUE 'DOWNLOAD_REWARD';

-- AlterTable
ALTER TABLE "downloads" ADD COLUMN     "success" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "uploaderRewarded" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "downloads_success_idx" ON "downloads"("success");

-- CreateIndex
CREATE INDEX "downloads_userId_documentId_success_idx" ON "downloads"("userId", "documentId", "success");
