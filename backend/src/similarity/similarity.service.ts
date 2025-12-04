/**
 * Similarity Service
 *
 * Main facade service for similarity operations.
 * Delegates to specialized sub-services for different functionality domains.
 */

import {
  SimilarityDetectionService,
  SimilarityEmbeddingService,
  SimilarityModerationService,
} from './services';
import { Injectable, OnModuleInit } from '@nestjs/common';

export interface SimilarityResult {
  documentId: string;
  title: string;
  similarityScore: number;
  similarityType: 'content' | 'hash' | 'text' | 'title' | 'description';
  uploader: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt: string;
}

export interface SimilarityDetectionResult {
  hasSimilarDocuments: boolean;
  similarDocuments: SimilarityResult[];
  highestSimilarityScore: number;
  totalSimilarDocuments: number;
}

@Injectable()
export class SimilarityService implements OnModuleInit {
  constructor(
    private readonly detectionService: SimilarityDetectionService,
    private readonly embeddingService: SimilarityEmbeddingService,
    private readonly moderationService: SimilarityModerationService,
  ) {}

  onModuleInit() {
    // Initialize circular dependency for embedding service
    this.embeddingService.setDetectionService(this.detectionService);
  }

  // ==================== Embedding Operations ====================

  /**
   * Generate embedding for a document
   * Delegates to SimilarityEmbeddingService
   */
  async generateDocumentEmbedding(documentId: string): Promise<number[]> {
    return this.embeddingService.generateDocumentEmbedding(documentId);
  }

  /**
   * Process similarity detection in background
   * Delegates to SimilarityEmbeddingService
   */
  async processSimilarityDetection(documentId: string): Promise<void> {
    return this.embeddingService.processSimilarityDetection(documentId);
  }

  // ==================== Detection Operations ====================

  /**
   * Detect similar documents for a given document
   * Delegates to SimilarityDetectionService
   */
  async detectSimilarDocuments(
    documentId: string,
  ): Promise<SimilarityDetectionResult> {
    return this.detectionService.detectSimilarDocuments(documentId);
  }

  // ==================== Moderation Operations ====================

  /**
   * Get similarity results for admin review
   * Delegates to SimilarityModerationService
   */
  async getSimilarityResultsForModeration(documentId: string): Promise<any> {
    return this.moderationService.getSimilarityResultsForModeration(documentId);
  }

  /**
   * Process admin decision on similarity
   * Delegates to SimilarityModerationService
   */
  async processSimilarityDecision(
    similarityId: string,
    adminId: string,
    decision: { isDuplicate: boolean; notes?: string },
  ): Promise<void> {
    return this.moderationService.processSimilarityDecision(
      similarityId,
      adminId,
      decision,
    );
  }
}
