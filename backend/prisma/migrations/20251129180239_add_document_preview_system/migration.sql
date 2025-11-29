-- CreateEnum
CREATE TYPE "PreviewStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "previewError" TEXT,
ADD COLUMN     "previewStatus" "PreviewStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "document_previews" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "previewPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "status" "PreviewStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_previews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_previews_documentId_idx" ON "document_previews"("documentId");

-- CreateIndex
CREATE INDEX "document_previews_status_idx" ON "document_previews"("status");

-- CreateIndex
CREATE UNIQUE INDEX "document_previews_documentId_pageNumber_key" ON "document_previews"("documentId", "pageNumber");

-- CreateIndex
CREATE INDEX "documents_previewStatus_idx" ON "documents"("previewStatus");

-- AddForeignKey
ALTER TABLE "document_previews" ADD CONSTRAINT "document_previews_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
