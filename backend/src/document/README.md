# Document Management Module

This module provides comprehensive document management functionality for the AI DocShare Platform, implementing all endpoints defined in the API specification.

## Features

### 🔍 Search & Discovery

- **Full-text search** with advanced filtering and sorting
- **AI-powered suggestions** for search queries
- **Personalized recommendations** using collaborative and content-based algorithms
- **Popular documents** trending in different time periods
- **Recent uploads** and **trending content**

### 📖 View & Download

- **Document details** with metadata and analytics
- **File download** with access control
- **Preview generation** for supported file types
- **AI-powered summaries** and content analysis
- **View tracking** for analytics

### 🛠️ Management

- **Document updates** (title, description, category, tags, etc.)
- **Document deletion** with ownership validation
- **My Documents** listing with filtering and sorting
- **Duplicate detection** based on file hashes

## Structure

```
src/document/
├── dto/                          # Data Transfer Objects
│   ├── search-documents.dto.ts   # Search parameters and filters
│   ├── suggestions.dto.ts        # AI suggestion parameters
│   ├── recommendations.dto.ts    # Recommendation algorithm options
│   ├── popular-documents.dto.ts  # Popular content filters
│   ├── recent-documents.dto.ts   # Recent content filters
│   ├── trending-documents.dto.ts # Trending content filters
│   ├── document-preview.dto.ts   # Preview generation options
│   ├── update-document.dto.ts    # Document update fields
│   ├── my-documents.dto.ts       # User documents listing
│   ├── duplicate-check.dto.ts    # Duplicate detection
│   └── index.ts                  # Barrel exports
├── interfaces/                   # TypeScript interfaces
│   ├── document.interface.ts     # Document response types
│   └── index.ts                  # Interface exports
├── document.controller.ts        # REST API endpoints
├── document.service.ts           # Business logic
├── document.module.ts            # NestJS module definition
├── index.ts                      # Module exports
└── README.md                     # This file
```

## API Endpoints

### Search & Discovery

| Method | Endpoint                     | Description                       |
| ------ | ---------------------------- | --------------------------------- |
| GET    | `/documents/search`          | Search documents with filters     |
| GET    | `/documents/suggestions`     | Get AI-powered search suggestions |
| GET    | `/documents/recommendations` | Get personalized recommendations  |
| GET    | `/documents/popular`         | Get popular documents             |
| GET    | `/documents/recent`          | Get recently uploaded documents   |
| GET    | `/documents/trending`        | Get trending documents            |

### View & Download

| Method | Endpoint                    | Description               |
| ------ | --------------------------- | ------------------------- |
| GET    | `/documents/:id`            | Get document details      |
| GET    | `/documents/:id/download`   | Download document file    |
| GET    | `/documents/:id/preview`    | Generate document preview |
| GET    | `/documents/:id/ai-summary` | Get AI-generated summary  |
| POST   | `/documents/:id/view`       | Record document view      |

### Management (Protected)

| Method | Endpoint                         | Description                   |
| ------ | -------------------------------- | ----------------------------- |
| GET    | `/documents/my-documents`        | Get user's uploaded documents |
| PUT    | `/documents/:id`                 | Update document metadata      |
| DELETE | `/documents/:id`                 | Delete document               |
| POST   | `/documents/:id/duplicate-check` | Check for duplicates          |

## Key Features

### Smart Search

- **Full-text search** across title, description, filename, and tags
- **Advanced filtering** by category, uploader, file type, rating, date range
- **Flexible sorting** by relevance, rating, downloads, views, date
- **Public/private** document filtering based on user authentication

### AI-Powered Features

- **Intelligent suggestions** based on search history and document content
- **Personalized recommendations** using hybrid algorithms:
  - **Collaborative filtering**: Based on similar user behavior
  - **Content-based**: Based on user preferences and document attributes
  - **Hybrid approach**: Combines both methods for optimal results

### Analytics & Insights

- **Popular documents** with customizable time periods
- **Trending analysis** with growth rate calculations
- **View tracking** and download analytics
- **Search history** recording for recommendation improvements

### Access Control

- **Public/private** document visibility
- **Owner-only** editing and deletion
- **Premium content** access control (ready for subscription features)
- **Download permissions** based on document settings

## Usage Examples

### Basic Search

```typescript
// Search for documents
const searchResult = await documentService.searchDocuments({
  q: 'machine learning',
  categoryId: 'tech-category-id',
  tags: ['AI', 'Python'],
  sort: SortBy.RATING,
  order: Order.DESC,
  page: 1,
  limit: 10,
});
```

### Get Recommendations

```typescript
// Get personalized recommendations
const recommendations = await documentService.getRecommendations(
  {
    algorithm: RecommendationAlgorithm.HYBRID,
    limit: 20,
    categoryId: 'specific-category',
  },
  userId
);
```

### Update Document

```typescript
// Update document metadata
const updated = await documentService.updateDocument(
  documentId,
  {
    title: 'Updated Title',
    description: 'New description',
    tags: ['tag1', 'tag2'],
    isPublic: true,
  },
  userId
);
```

## Integration Points

### Database Models

- **Document**: Main document entity with metadata
- **Category**: Document categorization
- **User**: Document ownership and preferences
- **AIAnalysis**: AI-generated content analysis
- **SearchHistory**: User search patterns
- **Download**: Download tracking
- **Rating**: Document ratings
- **Bookmark**: User bookmarks

### External Services

- **File Storage**: Integration with Cloudflare R2 for file operations
- **AI Services**: Content analysis and recommendation engines
- **Preview Generation**: Document preview and thumbnail creation
- **Analytics**: User behavior tracking and insights

## Security & Permissions

### Authentication

- **JWT-based** authentication for protected endpoints
- **Optional authentication** for public content access
- **User context** injection for personalization

### Authorization

- **Owner-only** document modification and deletion
- **Public/private** content visibility rules
- **Premium content** access control framework

### Data Protection

- **Input validation** using class-validator decorators
- **SQL injection prevention** through Prisma ORM
- **Access control** validation at service level

## Performance Considerations

### Database Optimization

- **Indexed fields** for common query patterns
- **Pagination** for large result sets
- **Efficient joins** with selective field inclusion
- **Query optimization** for search and filtering

### Caching Strategies

- **Popular content** caching for frequently accessed data
- **Search result** caching for common queries
- **Recommendation** caching for personalized content
- **Analytics data** caching for dashboard performance

### Scalability Features

- **Pagination** for all list endpoints
- **Configurable limits** for result set sizes
- **Async processing** for AI analysis and heavy operations
- **Modular architecture** for horizontal scaling

## Future Enhancements

### Advanced AI Features

- **Semantic search** using vector embeddings
- **Content similarity** analysis
- **Automatic tagging** and categorization
- **Content quality** scoring

### Social Features

- **User following** and activity feeds
- **Collaborative filtering** improvements
- **Social recommendations** based on network
- **Content sharing** and collaboration tools

### Analytics Dashboard

- **Real-time metrics** for content performance
- **User engagement** analytics
- **Search trend** analysis
- **Content optimization** insights
