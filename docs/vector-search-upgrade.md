# Vector Search Enhancement - Schema Upgrade Guide

## Tổng quan

Tài liệu này mô tả các thay đổi schema để nâng cấp hệ thống tìm kiếm từ traditional search sang hỗ trợ **Vector Search** (semantic search).

## Phân tích những gì đã có sẵn

### ✅ Có thể tận dụng:

1. **`DocumentEmbedding` model** (đã có từ trước)
   - Đã có field `embedding Float[]` để lưu vector embeddings cho documents
   - Đã có `model` và `version` để track embedding model version
   - Đã có code generate embeddings trong `similarity.service.ts`

2. **`SearchHistory` model** (đã có tracking cơ bản)
   - Đã track search queries và results
   - Có field `searchVector String?` (nhưng chỉ dùng cho analytics, không phải embedding)

### ❌ Cần bổ sung:

1. **Query embedding** - Chưa có cách lưu embedding của search query
2. **Search method tracking** - Chưa phân biệt được vector search vs traditional search
3. **Vector index** - Chưa có index tối ưu cho vector similarity search
4. **Search result metadata** - Chưa track similarity scores từ vector search

## Các thay đổi đã thực hiện

### 1. Nâng cấp `SearchHistory` model

**Thêm các fields mới:**
- `queryEmbedding Float[]?` - Lưu embedding vector của search query
- `searchMethod String` - Phân loại search type: "traditional", "vector", "hybrid"
- `vectorScore Float?` - Highest similarity score từ vector search (nếu có)

**Thêm index:**
- `@@index([searchMethod])` - Để query theo search method

### 2. Cập nhật `DocumentEmbedding` model

**Thêm comments:**
- Hướng dẫn về pgvector extension requirement
- Hướng dẫn tạo vector index (HNSW/IVFFlat)

## Migration Steps

### Bước 1: Tạo Prisma migration

Sau khi cập nhật schema, chạy:

```bash
cd backend
npx prisma migrate dev --name add_vector_search_fields
```

### Bước 2: Cài đặt pgvector extension (nếu chưa có)

Kết nối vào PostgreSQL database và chạy:

```sql
-- Cài đặt pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

### Bước 3: Tạo Vector Index cho `document_embeddings`

Sau khi migration hoàn thành, chạy SQL sau để tạo vector index:

```sql
-- Tạo HNSW index cho cosine similarity search (khuyến nghị cho production)
CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx
ON document_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Hoặc nếu database nhỏ, có thể dùng IVFFlat (nhanh hơn khi tạo, nhưng chậm hơn khi query)
-- CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx
-- ON document_embeddings
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);
```

**Lưu ý:**
- **HNSW**: Tốt cho production, query nhanh hơn nhưng index lớn hơn và tạo chậm hơn
- **IVFFlat**: Tốt cho development/test, tạo nhanh hơn nhưng query chậm hơn khi dataset lớn
- Tham số `m` và `ef_construction` cho HNSW có thể điều chỉnh dựa trên số lượng documents

### Bước 4: (Tùy chọn) Tạo Vector Index cho `search_history.queryEmbedding`

Nếu muốn tối ưu query embedding lookups:

```sql
CREATE INDEX IF NOT EXISTS search_history_query_embedding_idx
ON search_history
USING hnsw (query_embedding vector_cosine_ops)
WHERE query_embedding IS NOT NULL;
```

## Implementation Guide

### 1. Generate Query Embedding

Khi user search, generate embedding cho query:

```typescript
// Trong documents service hoặc search service
async function performVectorSearch(query: string) {
  // Generate query embedding
  const queryEmbedding = await aiService.generateEmbedding(query);

  // Save to search history
  await prisma.searchHistory.create({
    data: {
      userId: currentUserId,
      query,
      queryEmbedding,
      searchMethod: 'vector',
      // ... other fields
    },
  });

  // Perform vector search using raw SQL or Prisma + pgvector
  // ...
}
```

### 2. Vector Search Query (sử dụng Prisma Raw Query)

Prisma hiện tại không hỗ trợ trực tiếp pgvector operators, cần dùng raw SQL:

```typescript
async function findSimilarDocuments(queryEmbedding: number[], limit = 10, threshold = 0.7) {
  const results = await prisma.$queryRaw<Array<{
    documentId: string;
    similarityScore: number;
  }>>`
    SELECT
      de.document_id as "documentId",
      1 - (de.embedding <=> ${queryEmbedding}::vector) as "similarityScore"
    FROM document_embeddings de
    INNER JOIN documents d ON de.document_id = d.id
    WHERE
      d.is_approved = true
      AND d.is_public = true
      AND 1 - (de.embedding <=> ${queryEmbedding}::vector) >= ${threshold}
    ORDER BY de.embedding <=> ${queryEmbedding}::vector
    LIMIT ${limit}
  `;

  return results;
}
```

**Giải thích operators:**
- `<=>` : Cosine distance operator (pgvector)
- `1 - (embedding <=> query)` : Convert distance to similarity score (0-1)

### 3. Hybrid Search (Traditional + Vector)

Kết hợp full-text search với vector search:

```typescript
async function hybridSearch(
  query: string,
  filters: SearchFilters,
  vectorWeight = 0.7, // 70% vector, 30% traditional
) {
  // Traditional search
  const traditionalResults = await prisma.document.findMany({
    where: {
      // ... traditional filters
      OR: [
        { title: { contains: query, mode: 'insensitive' } } },
        { description: { contains: query, mode: 'insensitive' } } },
      ],
    },
  });

  // Vector search
  const queryEmbedding = await aiService.generateEmbedding(query);
  const vectorResults = await findSimilarDocuments(queryEmbedding);

  // Combine and rank
  const combined = combineSearchResults(traditionalResults, vectorResults, vectorWeight);

  return combined;
}
```

## Database Requirements

- **PostgreSQL 12+** (khuyến nghị 14+)
- **pgvector extension** - Cài đặt: `CREATE EXTENSION vector;`
- Đủ storage cho vector indexes (thường lớn hơn 2-3x so với dữ liệu gốc)

## Performance Considerations

1. **Index Size**: Vector indexes có thể rất lớn (ví dụ: 1536 dimensions × 4 bytes × số documents)
2. **Query Performance**:
   - HNSW: ~1-10ms cho 10K documents
   - IVFFlat: ~10-50ms cho 10K documents
3. **Maintenance**: Re-index khi update embeddings (có thể mất thời gian với HNSW)

## Testing

Sau khi migration:

1. Verify extension:
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

2. Verify indexes:
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('document_embeddings', 'search_history');
```

3. Test vector search:
```sql
-- Example query
SELECT
  d.id,
  d.title,
  1 - (de.embedding <=> (SELECT embedding FROM document_embeddings LIMIT 1)) as similarity
FROM documents d
JOIN document_embeddings de ON d.id = de.document_id
ORDER BY similarity DESC
LIMIT 5;
```

## Next Steps

1. ✅ Schema đã được cập nhật
2. ⏳ Chạy Prisma migration
3. ⏳ Cài đặt pgvector extension
4. ⏳ Tạo vector indexes
5. ⏳ Implement vector search service
6. ⏳ Update frontend để hỗ trợ vector search options
7. ⏳ Testing và optimization

## Tài liệu tham khảo

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Prisma Raw Queries](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access)
- [HNSW vs IVFFlat Comparison](https://github.com/pgvector/pgvector#indexes)


