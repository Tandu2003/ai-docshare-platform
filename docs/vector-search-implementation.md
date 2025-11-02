# Vector Search Implementation Guide

## Tổng quan

Hệ thống đã được tích hợp hoàn chỉnh với **Vector Search** (semantic search) sử dụng pgvector và OpenAI embeddings. Hệ thống hỗ trợ 3 phương thức tìm kiếm:

1. **Traditional Search** - Tìm kiếm text truyền thống (title, description, tags)
2. **Vector Search** - Tìm kiếm semantic dựa trên embeddings
3. **Hybrid Search** - Kết hợp cả hai phương thức (mặc định)

## Cài đặt

### 1. Prerequisites

- PostgreSQL 12+ (khuyến nghị 14+)
- pgvector extension
- OpenAI API key (hoặc có thể dùng placeholder cho development)

### 2. Setup Database

#### Bước 1: Cài đặt pgvector extension

```sql
-- Kết nối vào PostgreSQL database
CREATE EXTENSION IF NOT EXISTS vector;
```

#### Bước 2: Chạy Prisma migrations (tự động setup vector search)

```bash
cd backend
npx prisma migrate dev
```

Migration sẽ tự động:
- Cài đặt pgvector extension (nếu có quyền)
- Verify extension installation
- Tạo HNSW indexes cho vector columns
- Analyze tables để optimize queries

**Note**: Nếu migration fail do không có quyền tạo extension, bạn cần chạy thủ công:

```sql
-- As database admin/superuser
CREATE EXTENSION IF NOT EXISTS vector;
```

Sau đó chạy lại migration:

```bash
npx prisma migrate deploy
```

**Alternative**: Nếu cần setup thủ công, có thể dùng script:
```bash
psql -U postgres -d your_database -f backend/prisma/migrations/vector_search_setup.sql
```

### 3. Environment Variables

Đảm bảo đã có Gemini API key trong `backend/.env`:

```env
# Gemini API Configuration (for embeddings and AI analysis)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL_NAME=gemini-2.0-flash  # For AI analysis
EMBEDDING_MODEL=text-embedding-004  # Optional, default: text-embedding-004
```

**Note**:
- Hệ thống sử dụng **Gemini API** để tạo embeddings semantic
- Gemini model sẽ phân tích text và tạo vector representation (768 dimensions)
- Đây là phương pháp semantic embedding, không phải true embedding như OpenAI nhưng vẫn hiệu quả
- Nếu không có API key, hệ thống sẽ dùng placeholder embeddings (cho development/testing)
- Embedding dimension: 768 (standard)

## Sử dụng

### Backend API

#### Search Endpoint

```
GET /documents/search
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | - | Search query |
| `method` | string | No | `hybrid` | Search method: `traditional`, `vector`, `hybrid` |
| `page` | number | No | `1` | Page number |
| `limit` | number | No | `10` | Results per page (max 50) |
| `categoryId` | string | No | - | Filter by category |
| `tags` | string | No | - | Comma-separated tags |
| `language` | string | No | - | Filter by language |

**Example Requests:**

```bash
# Hybrid search (default)
curl "http://localhost:8080/documents/search?q=machine+learning&method=hybrid"

# Vector search only
curl "http://localhost:8080/documents/search?q=AI+algorithms&method=vector"

# Traditional search
curl "http://localhost:8080/documents/search?q=python+tutorial&method=traditional"

# With filters
curl "http://localhost:8080/documents/search?q=AI&method=hybrid&categoryId=xxx&tags=ai,ml&language=en"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "doc123",
        "title": "Machine Learning Basics",
        "description": "...",
        "similarityScore": 0.87,
        // ... other fields
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 10,
    "searchMethod": "hybrid"
  },
  "message": "Tìm kiếm tài liệu thành công"
}
```

### Frontend Service

```typescript
import { DocumentsService } from '@/services/files.service';

// Hybrid search (default)
const results = await DocumentsService.searchDocuments(
  'machine learning',
  1,
  10,
  'hybrid',
  {
    categoryId: 'xxx',
    tags: ['ai', 'ml'],
    language: 'en'
  }
);

// Vector search
const vectorResults = await DocumentsService.searchDocuments(
  'deep learning algorithms',
  1,
  10,
  'vector'
);

// Traditional search
const traditionalResults = await DocumentsService.searchDocuments(
  'python tutorial',
  1,
  10,
  'traditional'
);
```

### UI Component

`DocumentSearch` component đã được cập nhật với UI để chọn search method:

- **Truyền thống** - Text-based search
- **AI Vector** - Semantic vector search
- **Kết hợp** - Hybrid (default)

Component tự động sử dụng search method được chọn khi user search.

## Auto-Generate Embeddings

Hệ thống tự động generate embeddings khi:

1. **Document được upload** và được approve/public
2. Embedding được tạo trong background (không block document creation)
3. Sử dụng AI analysis summary > description > title + tags làm input

### Manual Embedding Generation

Nếu cần generate embedding cho documents cũ:

```typescript
// Backend service method
await documentsService.generateDocumentEmbedding(documentId);
```

Hoặc qua similarity service:

```bash
POST /similarity/embedding/:documentId
```

## Architecture

### Components

1. **EmbeddingService** (`backend/src/ai/embedding.service.ts`)
   - Generate embeddings từ text
   - Support OpenAI API hoặc placeholder

2. **VectorSearchService** (`backend/src/ai/vector-search.service.ts`)
   - `vectorSearch()` - Pure vector search
   - `hybridSearch()` - Combine vector + traditional
   - `textSearch()` - Traditional fallback

3. **DocumentsService**
   - `searchDocuments()` - Main search method với support cho 3 modes
   - `generateDocumentEmbedding()` - Auto-generate embeddings

4. **DocumentsController**
   - `GET /documents/search` - Search endpoint

### Database Schema

**SearchHistory:**
- `queryEmbedding Float[]` - Embedding của search query
- `searchMethod String` - Method được sử dụng
- `vectorScore Float?` - Highest similarity score

**DocumentEmbedding:**
- `embedding Float[]` - Vector embedding của document
- Có index HNSW cho fast similarity search

### Vector Search Flow

```
User Query
  ↓
Generate Query Embedding (EmbeddingService)
  ↓
Vector Similarity Search (pgvector <=> operator)
  ↓
Filter by Document Access Permissions
  ↓
Combine with Traditional Search (if hybrid)
  ↓
Rank and Sort Results
  ↓
Save Search History with Embedding
  ↓
Return Results with Similarity Scores
```

## Performance

### Index Performance

- **HNSW Index**:
  - Query time: ~1-10ms cho 10K documents
  - Index size: ~2-3x so với data size
  - Best for: Production, large datasets

- **IVFFlat Index**:
  - Query time: ~10-50ms cho 10K documents
  - Index size: ~1.5x so với data size
  - Best for: Development, smaller datasets

### Optimization Tips

1. **Index Maintenance:**
```sql
-- Reindex after bulk updates
REINDEX INDEX document_embeddings_embedding_idx;
ANALYZE document_embeddings;
```

2. **Query Performance:**
- Adjust `threshold` parameter để filter low-quality results
- Limit results với pagination
- Use filters (category, tags) để reduce search space

3. **Embedding Generation:**
- Run in background (async)
- Batch process nếu có nhiều documents cần embedding
- Cache embeddings (đã được save vào DB)

## Troubleshooting

### Embeddings không được generate

1. Check logs: `Failed to generate embedding`
2. Verify OpenAI API key trong `.env`
3. Check document có content không (title, description, hoặc AI analysis)
4. Verify document is approved and public

### Vector search trả về empty results

1. Verify pgvector extension: `SELECT * FROM pg_extension WHERE extname = 'vector';`
2. Check index exists: `\d document_embeddings`
3. Verify documents có embeddings: `SELECT COUNT(*) FROM document_embeddings;`
4. Check threshold không quá cao

### Performance issues

1. Verify indexes: `SELECT indexname FROM pg_indexes WHERE tablename = 'document_embeddings';`
2. Analyze tables: `ANALYZE document_embeddings;`
3. Check work_mem setting
4. Consider reindexing nếu dataset lớn

## Testing

### Test Vector Search

```sql
-- Test query
SELECT
    d.id,
    d.title,
    1 - (de.embedding <=> (
        SELECT embedding FROM document_embeddings LIMIT 1
    )) as similarity
FROM documents d
JOIN document_embeddings de ON d.id = de.document_id
ORDER BY similarity DESC
LIMIT 5;
```

### Test API

```bash
# Test search endpoint
curl "http://localhost:8080/documents/search?q=test&method=hybrid"

# Check search history
curl "http://localhost:8080/documents/search?q=test" -H "Authorization: Bearer <token>"
```

## Next Steps

1. ✅ Vector search implemented
2. ✅ Auto-generate embeddings
3. ✅ UI for search method selection
4. ✅ Migration scripts
5. ⏳ Batch embedding generation cho existing documents
6. ⏳ Analytics dashboard cho search performance
7. ⏳ A/B testing cho search methods

## References

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
- [Prisma Raw Queries](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access)

