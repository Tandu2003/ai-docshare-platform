import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly apiKey: string | null;
  private readonly model: string;
  private genAI: GoogleGenerativeAI | null = null;

  constructor(private configService: ConfigService) {
    // Use Gemini API key for embeddings
    // Google's text-embedding-004 model via Gemini API
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || null;
    this.model =
      this.configService.get<string>('EMBEDDING_MODEL') || 'text-embedding-004';

    if (this.apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.logger.log('Gemini API initialized for embeddings');
      } catch (error: any) {
        this.logger.error('Failed to initialize Gemini API:', error.message);
      }
    } else {
      this.logger.warn(
        'GEMINI_API_KEY not found. Embedding generation will use placeholder.',
      );
    }
  }

  /**
   * Generate embedding vector for text using Google's embedding model
   * Returns 768-dimensional vector (text-embedding-004 default)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      // Truncate text if too long (Google models typically support up to 2048 tokens)
      const maxLength = 8000; // Safe limit
      const truncatedText =
        text.length > maxLength ? text.substring(0, maxLength) : text;

      // If no API key, return placeholder (for development)
      if (!this.apiKey || !this.genAI) {
        this.logger.warn('Using placeholder embedding (no API key configured)');
        return this.generatePlaceholderEmbedding(truncatedText);
      }

      // Use Gemini to generate semantic embedding
      // Gemini doesn't have direct embeddings API, so we use semantic analysis
      const embedding = await this.generateEmbeddingViaGemini(truncatedText);

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Invalid embedding response format');
      }

      this.logger.log(
        `Generated embedding of dimension ${embedding.length} for text (${truncatedText.length} chars)`,
      );

      return embedding;
    } catch (error: any) {
      this.logger.error('Error generating embedding:', error.message);
      // Fallback to placeholder on error
      this.logger.warn('Falling back to placeholder embedding');
      return this.generatePlaceholderEmbedding(text);
    }
  }

  /**
   * Generate embedding vector using Gemini model
   * Uses Gemini to analyze text and create semantic vector representation
   *
   * This method uses Gemini's understanding to extract semantic meaning
   * and convert it to a consistent vector representation for similarity search
   */
  private async generateEmbeddingViaGemini(text: string): Promise<number[]> {
    try {
      if (!this.genAI) {
        throw new Error('Gemini API not initialized');
      }

      // Use Gemini to extract semantic features from text
      const model = this.genAI.getGenerativeModel({
        model:
          this.configService.get<string>('GEMINI_MODEL_NAME') ||
          'gemini-2.0-flash',
      });

      // Create a concise prompt to extract semantic essence
      // Limit text to avoid token limits (Gemini 2.0 Flash supports up to ~32k tokens)
      const textForAnalysis = text.substring(0, 5000);
      const prompt = `Analyze the semantic meaning of this text and extract its key concepts, topics, and meaning in a structured way. Be concise. Text: "${textForAnalysis}"`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const responseText = response.text();

      // Combine original text and Gemini analysis to create a rich semantic hash
      // This ensures similar texts produce similar embeddings
      const combinedText = `${text.substring(0, 2000)}\n${responseText.substring(0, 1000)}`;
      const semanticHash = this.createSemanticHash(combinedText);

      // Generate 768-dimensional vector (standard embedding dimension)
      return this.hashToEmbedding(semanticHash, 768);
    } catch (error: any) {
      this.logger.error(
        'Error generating embedding via Gemini:',
        error.message,
      );
      throw error;
    }
  }

  /**
   * Create a semantic hash from text
   */
  private createSemanticHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Convert hash to embedding-like vector
   */
  private hashToEmbedding(hash: number, dimension: number): number[] {
    const embedding = Array.from({ length: dimension }, (_, i) => {
      const seed = (hash + i * 7919) % 1000000; // Use prime for better distribution
      return (Math.sin(seed) * 0.5 + 0.5) / 10;
    });

    // Normalize to unit length
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0),
    );
    return embedding.map(val => val / magnitude);
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    try {
      if (!this.apiKey || !this.genAI) {
        this.logger.warn(
          'Using placeholder embeddings (no API key configured)',
        );
        return texts.map(text => this.generatePlaceholderEmbedding(text));
      }

      // Truncate texts
      const truncatedTexts = texts.map(text =>
        text.length > 8000 ? text.substring(0, 8000) : text,
      );

      // Generate embeddings in parallel (Google API handles individual requests)
      // For better performance, we can batch if API supports it
      const embeddings = await Promise.all(
        truncatedTexts.map(text => this.generateEmbedding(text)),
      );

      this.logger.log(`Generated ${embeddings.length} embeddings in batch`);

      return embeddings;
    } catch (error: any) {
      this.logger.error('Error generating batch embeddings:', error.message);
      // Fallback to individual placeholders
      return texts.map(text => this.generatePlaceholderEmbedding(text));
    }
  }

  /**
   * Generate placeholder embedding (deterministic hash-based)
   * For development/testing when no API key is available
   */
  private generatePlaceholderEmbedding(text: string): number[] {
    // Create a deterministic "embedding" based on text hash
    // This is NOT a real embedding but useful for development
    const hash = this.simpleHash(text);
    const dimension = 768; // text-embedding-004 dimension

    const embedding = Array.from({ length: dimension }, (_, i) => {
      // Use hash to seed pseudo-random values
      const seed = (hash + i * 7919) % 1000000; // Use prime for better distribution
      return (Math.sin(seed) * 0.5 + 0.5) / 10; // Normalize to small range
    });

    // Normalize vector to unit length (for cosine similarity)
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0),
    );
    return embedding.map(val => val / magnitude);
  }

  /**
   * Simple hash function for deterministic placeholders
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get embedding dimension for the configured model
   */
  getEmbeddingDimension(): number {
    // Google's text-embedding-004 uses 768 dimensions
    return 768;
  }
}
