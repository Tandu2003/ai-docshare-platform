# AI Advanced Features API

## Document Analysis

### POST /api/ai/analyze-document

Phân tích tài liệu bằng AI

**Body:**

```json
{
  "documentId": "string", // ID tài liệu
  "analysisType": "string[]", // ["summary", "key_points", "tags", "difficulty", "quality"]
  "options": {
    "language": "string", // Ngôn ngữ phân tích
    "maxSummaryLength": "number", // Độ dài tóm tắt tối đa
    "includeSentiment": "boolean", // Bao gồm phân tích cảm xúc
    "includeTopics": "boolean" // Bao gồm chủ đề
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "documentId": "string",
    "analysis": {
      "summary": "string",
      "keyPoints": "string[]",
      "suggestedTags": "string[]",
      "difficulty": "string",
      "readingTime": "number",
      "confidence": "number",
      "sentimentScore": "number",
      "topicModeling": {
        "topics": [
          {
            "topic": "string",
            "weight": "number",
            "keywords": "string[]"
          }
        ]
      },
      "namedEntities": {
        "persons": "string[]",
        "organizations": "string[]",
        "locations": "string[]",
        "dates": "string[]"
      },
      "qualityScore": "number",
      "completenessScore": "number",
      "structureScore": "number"
    },
    "processedAt": "string",
    "processingTime": "number"
  }
}
```

### GET /api/ai/document-insights/:id

Thông tin chi tiết AI của tài liệu

**Response:**

```json
{
  "success": true,
  "data": {
    "documentId": "string",
    "analysis": {
      "summary": "string",
      "keyPoints": "string[]",
      "suggestedTags": "string[]",
      "difficulty": "string",
      "readingTime": "number",
      "confidence": "number",
      "sentimentScore": "number",
      "topicModeling": {
        "topics": [
          {
            "topic": "string",
            "weight": "number",
            "keywords": "string[]"
          }
        ]
      },
      "namedEntities": {
        "persons": "string[]",
        "organizations": "string[]",
        "locations": "string[]",
        "dates": "string[]"
      },
      "qualityScore": "number",
      "completenessScore": "number",
      "structureScore": "number",
      "readabilityScore": "number",
      "technicalLevel": "string"
    },
    "insights": {
      "targetAudience": "string",
      "prerequisites": "string[]",
      "learningObjectives": "string[]",
      "relatedConcepts": "string[]",
      "estimatedStudyTime": "number"
    },
    "processedAt": "string",
    "lastUpdated": "string"
  }
}
```

### POST /api/ai/generate-tags

Tạo thẻ tự động cho tài liệu

**Body:**

```json
{
  "documentId": "string", // ID tài liệu
  "title": "string", // Tiêu đề tài liệu
  "description": "string", // Mô tả tài liệu
  "content": "string", // Nội dung tài liệu (optional)
  "categoryId": "string", // ID danh mục
  "existingTags": "string[]", // Thẻ đã có
  "maxTags": "number" // Số thẻ tối đa (default: 10)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "suggestedTags": [
      {
        "tag": "string",
        "confidence": "number",
        "reason": "string",
        "category": "string"
      }
    ],
    "relatedTags": [
      {
        "tag": "string",
        "correlation": "number"
      }
    ],
    "processingTime": "number"
  }
}
```

### GET /api/ai/similar-documents/:id

Tìm tài liệu tương tự

**Query Parameters:**

```json
{
  "algorithm": "string", // "content", "semantic", "hybrid"
  "limit": "number", // Số tài liệu tương tự (default: 10)
  "minSimilarity": "number", // Độ tương tự tối thiểu (0-1)
  "categoryFilter": "string" // Lọc theo danh mục
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "sourceDocument": {
      "id": "string",
      "title": "string",
      "category": {
        "id": "string",
        "name": "string"
      }
    },
    "similarDocuments": [
      {
        "document": {
          "id": "string",
          "title": "string",
          "description": "string",
          "thumbnailPath": "string",
          "uploader": {
            "id": "string",
            "username": "string",
            "firstName": "string",
            "lastName": "string"
          },
          "category": {
            "id": "string",
            "name": "string"
          },
          "averageRating": "number",
          "downloadCount": "number"
        },
        "similarityScore": "number",
        "similarityReason": "string",
        "commonTopics": "string[]",
        "commonTags": "string[]"
      }
    ],
    "algorithm": "string",
    "processingTime": "number"
  }
}
```

### POST /api/ai/content-quality-check

Kiểm tra chất lượng nội dung

**Body:**

```json
{
  "documentId": "string", // ID tài liệu
  "content": "string", // Nội dung cần kiểm tra
  "checkTypes": "string[]" // ["plagiarism", "grammar", "structure", "completeness"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "documentId": "string",
    "qualityReport": {
      "overallScore": "number",
      "plagiarismScore": "number",
      "grammarScore": "number",
      "structureScore": "number",
      "completenessScore": "number",
      "readabilityScore": "number"
    },
    "issues": [
      {
        "type": "string",
        "severity": "string", // "low", "medium", "high"
        "description": "string",
        "suggestion": "string",
        "position": "number"
      }
    ],
    "suggestions": [
      {
        "category": "string",
        "suggestion": "string",
        "priority": "string"
      }
    ],
    "plagiarismCheck": {
      "score": "number",
      "sources": [
        {
          "url": "string",
          "title": "string",
          "similarity": "number",
          "matchedText": "string"
        }
      ]
    },
    "processingTime": "number"
  }
}
```

## Content Recognition

### POST /api/ai/ocr-process

Xử lý OCR cho tài liệu ảnh

**Body (multipart/form-data):**

```json
{
  "file": "File", // File ảnh cần xử lý
  "language": "string", // Ngôn ngữ (default: "auto")
  "options": {
    "extractText": "boolean", // Trích xuất văn bản
    "extractTables": "boolean", // Trích xuất bảng
    "extractImages": "boolean", // Trích xuất hình ảnh
    "confidence": "number" // Ngưỡng tin cậy (0-1)
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "processedFile": "string",
    "extractedText": "string",
    "tables": [
      {
        "tableId": "string",
        "data": "string[][]",
        "confidence": "number"
      }
    ],
    "images": [
      {
        "imageId": "string",
        "description": "string",
        "confidence": "number"
      }
    ],
    "confidence": "number",
    "processingTime": "number"
  }
}
```

### POST /api/ai/extract-metadata

Trích xuất metadata từ tài liệu

**Body:**

```json
{
  "documentId": "string", // ID tài liệu
  "extractTypes": "string[]" // ["title", "author", "date", "keywords", "abstract"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "documentId": "string",
    "metadata": {
      "title": "string",
      "authors": "string[]",
      "date": "string",
      "keywords": "string[]",
      "abstract": "string",
      "doi": "string",
      "publisher": "string",
      "language": "string",
      "pages": "number",
      "references": "string[]"
    },
    "confidence": "number",
    "processingTime": "number"
  }
}
```

## Smart Recommendations

### GET /api/ai/recommendations/advanced

Đề xuất nâng cao

**Query Parameters:**

```json
{
  "userId": "string", // ID người dùng
  "algorithm": "string", // "collaborative", "content", "hybrid", "contextual"
  "context": {
    "currentDocument": "string", // ID tài liệu hiện tại
    "searchQuery": "string", // Từ khóa tìm kiếm
    "category": "string", // Danh mục quan tâm
    "timeOfDay": "string", // Thời gian trong ngày
    "device": "string" // Thiết bị sử dụng
  },
  "limit": "number", // Số đề xuất (default: 10)
  "diversity": "number" // Độ đa dạng (0-1)
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "document": {
          "id": "string",
          "title": "string",
          "description": "string",
          "thumbnailPath": "string",
          "uploader": {
            "id": "string",
            "username": "string",
            "firstName": "string",
            "lastName": "string"
          },
          "category": {
            "id": "string",
            "name": "string"
          },
          "averageRating": "number",
          "downloadCount": "number"
        },
        "score": "number",
        "reason": "string",
        "algorithm": "string",
        "confidence": "number",
        "explanation": "string"
      }
    ],
    "algorithm": "string",
    "context": {},
    "processingTime": "number"
  }
}
```

### POST /api/ai/recommendations/feedback

Phản hồi về đề xuất

**Body:**

```json
{
  "recommendationId": "string",
  "userId": "string",
  "documentId": "string",
  "action": "string", // "view", "download", "bookmark", "ignore"
  "rating": "number", // Đánh giá (1-5)
  "feedback": "string" // Phản hồi chi tiết
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Feedback recorded successfully",
    "modelUpdated": "boolean"
  }
}
```

## Content Generation

### POST /api/ai/generate-summary

Tạo tóm tắt tự động

**Body:**

```json
{
  "documentId": "string", // ID tài liệu
  "summaryType": "string", // "brief", "detailed", "bullet_points"
  "maxLength": "number", // Độ dài tối đa
  "focusAreas": "string[]" // Các lĩnh vực tập trung
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "documentId": "string",
    "summary": "string",
    "summaryType": "string",
    "keyPoints": "string[]",
    "wordCount": "number",
    "processingTime": "number"
  }
}
```

### POST /api/ai/generate-description

Tạo mô tả tự động

**Body:**

```json
{
  "title": "string", // Tiêu đề tài liệu
  "content": "string", // Nội dung tài liệu
  "categoryId": "string", // ID danh mục
  "targetLength": "number", // Độ dài mục tiêu
  "style": "string" // "academic", "casual", "professional"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "description": "string",
    "wordCount": "number",
    "style": "string",
    "processingTime": "number"
  }
}
```

## Learning Analytics

### GET /api/ai/learning-path

Đường dẫn học tập cá nhân hóa

**Query Parameters:**

```json
{
  "userId": "string", // ID người dùng
  "topic": "string", // Chủ đề quan tâm
  "difficulty": "string", // "beginner", "intermediate", "advanced"
  "timeAvailable": "number", // Thời gian có sẵn (phút)
  "learningStyle": "string" // "visual", "auditory", "reading", "kinesthetic"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "userId": "string",
    "topic": "string",
    "learningPath": [
      {
        "step": "number",
        "document": {
          "id": "string",
          "title": "string",
          "description": "string",
          "difficulty": "string",
          "estimatedTime": "number"
        },
        "reason": "string",
        "prerequisites": "string[]",
        "learningObjectives": "string[]"
      }
    ],
    "totalTime": "number",
    "difficultyProgression": "string",
    "estimatedCompletion": "string",
    "processingTime": "number"
  }
}
```

### GET /api/ai/knowledge-gap

Phân tích khoảng trống kiến thức

**Query Parameters:**

```json
{
  "userId": "string", // ID người dùng
  "topic": "string", // Chủ đề
  "assessmentData": "string[]" // Dữ liệu đánh giá
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "userId": "string",
    "topic": "string",
    "knowledgeGaps": [
      {
        "concept": "string",
        "importance": "number",
        "currentLevel": "number",
        "targetLevel": "number",
        "recommendedDocuments": "string[]"
      }
    ],
    "strengths": "string[]",
    "weaknesses": "string[]",
    "recommendations": "string[]",
    "processingTime": "number"
  }
}
```

## AI Model Management

### GET /api/ai/models/status

Trạng thái các mô hình AI

**Response:**

```json
{
  "success": true,
  "data": {
    "models": [
      {
        "name": "string",
        "version": "string",
        "status": "string", // "active", "training", "maintenance"
        "performance": {
          "accuracy": "number",
          "precision": "number",
          "recall": "number",
          "f1Score": "number"
        },
        "lastUpdated": "string",
        "nextUpdate": "string"
      }
    ],
    "overallHealth": "string", // "healthy", "warning", "critical"
    "systemLoad": "number"
  }
}
```

### POST /api/ai/models/retrain

Huấn luyện lại mô hình

**Body:**

```json
{
  "modelName": "string", // Tên mô hình
  "trainingData": "string[]", // Dữ liệu huấn luyện
  "parameters": {
    "epochs": "number",
    "learningRate": "number",
    "batchSize": "number"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "trainingId": "string",
    "status": "string",
    "estimatedTime": "number",
    "message": "Model training started"
  }
}
```

### GET /api/ai/models/performance

Hiệu suất mô hình AI

**Query Parameters:**

```json
{
  "modelName": "string", // Tên mô hình
  "period": "string", // "day", "week", "month"
  "metric": "string" // "accuracy", "precision", "recall", "f1"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "modelName": "string",
    "performance": {
      "accuracy": "number",
      "precision": "number",
      "recall": "number",
      "f1Score": "number",
      "latency": "number"
    },
    "trends": [
      {
        "date": "string",
        "accuracy": "number",
        "precision": "number",
        "recall": "number",
        "f1Score": "number"
      }
    ],
    "comparison": {
      "previousVersion": "number",
      "industryAverage": "number"
    }
  }
}
```
