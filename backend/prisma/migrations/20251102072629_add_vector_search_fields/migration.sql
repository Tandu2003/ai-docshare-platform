-- AlterTable
ALTER TABLE "search_history" ADD COLUMN     "queryEmbedding" DOUBLE PRECISION[],
ADD COLUMN     "searchMethod" TEXT NOT NULL DEFAULT 'traditional',
ADD COLUMN     "vectorScore" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "search_history_searchMethod_idx" ON "search_history"("searchMethod");
