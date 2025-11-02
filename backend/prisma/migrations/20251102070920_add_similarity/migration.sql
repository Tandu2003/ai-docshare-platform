-- CreateTable
CREATE TABLE "document_embeddings" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "model" TEXT NOT NULL DEFAULT 'text-embedding-ada-002',
    "version" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_similarities" (
    "id" TEXT NOT NULL,
    "sourceDocumentId" TEXT NOT NULL,
    "targetDocumentId" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "similarityType" TEXT NOT NULL DEFAULT 'content',
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "isDuplicate" BOOLEAN,
    "adminNotes" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_similarities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "similarity_jobs" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "similarity_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_embeddings_documentId_key" ON "document_embeddings"("documentId");

-- CreateIndex
CREATE INDEX "document_embeddings_documentId_idx" ON "document_embeddings"("documentId");

-- CreateIndex
CREATE INDEX "document_embeddings_model_idx" ON "document_embeddings"("model");

-- CreateIndex
CREATE INDEX "document_embeddings_createdAt_idx" ON "document_embeddings"("createdAt");

-- CreateIndex
CREATE INDEX "document_similarities_sourceDocumentId_idx" ON "document_similarities"("sourceDocumentId");

-- CreateIndex
CREATE INDEX "document_similarities_targetDocumentId_idx" ON "document_similarities"("targetDocumentId");

-- CreateIndex
CREATE INDEX "document_similarities_similarityScore_idx" ON "document_similarities"("similarityScore");

-- CreateIndex
CREATE INDEX "document_similarities_isProcessed_idx" ON "document_similarities"("isProcessed");

-- CreateIndex
CREATE INDEX "document_similarities_createdAt_idx" ON "document_similarities"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "document_similarities_sourceDocumentId_targetDocumentId_key" ON "document_similarities"("sourceDocumentId", "targetDocumentId");

-- CreateIndex
CREATE INDEX "similarity_jobs_documentId_idx" ON "similarity_jobs"("documentId");

-- CreateIndex
CREATE INDEX "similarity_jobs_status_idx" ON "similarity_jobs"("status");

-- CreateIndex
CREATE INDEX "similarity_jobs_createdAt_idx" ON "similarity_jobs"("createdAt");

-- AddForeignKey
ALTER TABLE "document_embeddings" ADD CONSTRAINT "document_embeddings_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_similarities" ADD CONSTRAINT "document_similarities_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_similarities" ADD CONSTRAINT "document_similarities_targetDocumentId_fkey" FOREIGN KEY ("targetDocumentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_similarities" ADD CONSTRAINT "document_similarities_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "similarity_jobs" ADD CONSTRAINT "similarity_jobs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
