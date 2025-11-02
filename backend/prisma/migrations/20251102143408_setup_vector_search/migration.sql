-- ============================================
-- Vector Search Setup Migration
-- ============================================
-- This migration sets up pgvector extension and creates vector indexes
-- for efficient vector similarity search
--
-- Note: CREATE EXTENSION may require superuser privileges.
-- If this fails, you may need to run it manually as database admin.
-- ============================================

-- Step 1: Install pgvector extension (if not already installed)
-- This may fail if user doesn't have superuser privileges
-- In that case, ask database admin to run: CREATE EXTENSION vector;
DO $$
BEGIN
    -- Try to create extension
    CREATE EXTENSION IF NOT EXISTS vector;

    RAISE NOTICE 'pgvector extension installed/verified successfully';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE WARNING 'Cannot create pgvector extension: insufficient privileges. Please ask database administrator to run: CREATE EXTENSION vector;';
    WHEN OTHERS THEN
        -- Extension might already exist or other error
        RAISE NOTICE 'pgvector extension check completed (may already exist)';
END $$;

-- Verify extension installation (informative only)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        RAISE NOTICE 'pgvector extension is installed and ready';
    ELSE
        RAISE WARNING 'pgvector extension is not installed. Vector search will not work until extension is installed.';
    END IF;
END $$;

-- ============================================
-- Step 2: Create Vector Index for document_embeddings
-- ============================================

-- Drop existing index if it exists (in case of re-migration)
DROP INDEX IF EXISTS document_embeddings_embedding_idx;

-- Create HNSW index for cosine similarity search
-- HNSW (Hierarchical Navigable Small World) is recommended for production
-- This will only work if pgvector extension is installed
DO $$
BEGIN
    -- Check if vector type exists (means extension is installed)
    IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'vector'
    ) THEN
        -- Create HNSW index using EXECUTE for dynamic SQL
        EXECUTE format(
            'CREATE INDEX document_embeddings_embedding_idx ON document_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)'
        );

        RAISE NOTICE 'Created HNSW index for document_embeddings.embedding';
    ELSE
        RAISE WARNING 'Skipping vector index creation: pgvector extension not installed. Please install extension and run migration again.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error creating vector index: %. Index may need to be created manually.', SQLERRM;
END $$;

-- ============================================
-- Step 3: Create Vector Index for search_history.query_embedding (Optional)
-- ============================================

-- Drop existing index if it exists
DROP INDEX IF EXISTS search_history_query_embedding_idx;

-- Create index for query embeddings (helps with search analytics)
DO $$
BEGIN
    -- Check if vector type exists and column exists
    IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'vector'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'search_history'
        AND column_name = 'queryEmbedding'
    ) THEN
        -- Execute CREATE INDEX with proper syntax for partial index
        EXECUTE format(
            'CREATE INDEX search_history_query_embedding_idx ON search_history USING hnsw (query_embedding vector_cosine_ops) WHERE query_embedding IS NOT NULL WITH (m = 16, ef_construction = 64)'
        );

        RAISE NOTICE 'Created HNSW index for search_history.query_embedding';
    ELSE
        RAISE NOTICE 'Skipping query_embedding index (extension not installed or column not found)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error creating query_embedding index: %. Index may need to be created manually.', SQLERRM;
END $$;

-- ============================================
-- Step 4: Analyze tables for query optimization
-- ============================================

-- Update table statistics for better query planning
ANALYZE document_embeddings;

-- Only analyze search_history if it has query_embedding column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'search_history'
        AND column_name = 'queryEmbedding'
    ) THEN
        ANALYZE search_history;
    END IF;
END $$;

-- ============================================
-- Step 5: Verify indexes (informative)
-- ============================================

DO $$
DECLARE
    index_count INTEGER;
    extension_installed BOOLEAN;
BEGIN
    -- Check if extension is installed
    SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
    ) INTO extension_installed;

    IF extension_installed THEN
        -- Count vector indexes
        SELECT COUNT(*) INTO index_count
        FROM pg_indexes
        WHERE tablename IN ('document_embeddings', 'search_history')
          AND indexname LIKE '%embedding%';

        RAISE NOTICE 'Vector search setup complete. Found % vector indexes.', index_count;

        IF index_count < 1 THEN
            RAISE WARNING 'No vector indexes found. Vector search may not work optimally.';
        END IF;
    ELSE
        RAISE WARNING 'pgvector extension not installed. Vector indexes were not created. Please install extension manually.';
    END IF;
END $$;


