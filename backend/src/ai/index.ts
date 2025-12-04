/**
 * AI Module - Centralized exports
 *
 * This module provides AI-powered services for document analysis,
 * embeddings generation, and vector search capabilities.
 */

// ============================================================================
// Services
// ============================================================================
export { AIService } from './ai.service';
export { GeminiService } from './gemini.service';
export { EmbeddingService } from './embedding.service';
export { VectorSearchService } from './vector-search.service';
export { ContentExtractorService } from './content-extractor.service';
export { EmbeddingMigrationService } from './embedding-migration.service';
export {
  QueryProcessorService,
  SearchCacheService,
  SearchHistoryService,
  SearchMetricsService,
} from './services';

// ============================================================================
// Controllers
// ============================================================================
export { AIController } from './controllers/ai.controller';

// ============================================================================
// Interfaces & Types
// ============================================================================
export type {
  AIAnalysisRequest,
  AIAnalysisResponse,
  DocumentAnalysisData,
  EmbeddingMetrics,
  VectorSearchOptions,
  VectorSearchFilters,
  VectorSearchResult,
  HybridSearchResult,
  SearchMetrics,
  DocumentDifficulty,
  ModerationAction,
} from './interfaces';

// ============================================================================
// DTOs
// ============================================================================
export { AnalyzeDocumentDto } from './dto';
