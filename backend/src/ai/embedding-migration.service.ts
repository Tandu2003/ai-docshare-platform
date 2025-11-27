import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmbeddingMigrationStatus {
  totalEmbeddings: number;
  outdatedEmbeddings: number;
  currentModel: string;
  isRegenerationRequired: boolean;
  modelsFound: string[];
}

export interface RegenerationProgress {
  total: number;
  completed: number;
  failed: number;
  percentage: number;
}

@Injectable()
export class EmbeddingMigrationService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingMigrationService.name);
  private isRegenerating = false;
  private regenerationProgress: RegenerationProgress = {
    total: 0,
    completed: 0,
    failed: 0,
    percentage: 0,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Check embedding model consistency on module initialization
   */
  async onModuleInit() {
    // Check if auto migration is enabled (default: true)
    const autoMigrate =
      this.configService.get<string>('EMBEDDING_AUTO_MIGRATE') !== 'false';

    if (!autoMigrate) {
      this.logger.log(
        '⏭️ Bỏ qua kiểm tra migration embedding tự động (EMBEDDING_AUTO_MIGRATE=false)',
      );
      return;
    }

    // Check if embedding service is properly configured
    if (!this.embeddingService.isConfigured()) {
      this.logger.warn(
        '⚠️ Embedding service chưa được cấu hình đúng (thiếu GEMINI_API_KEY). Bỏ qua migration.',
      );
      return;
    }

    this.logger.log('🔍 Kiểm tra tính nhất quán của model embedding...');

    try {
      const status = await this.checkEmbeddingModelConsistency();

      if (status.isRegenerationRequired) {
        this.logger.warn(
          `⚠️ Phát hiện ${status.outdatedEmbeddings}/${status.totalEmbeddings} embedding cần được regenerate`,
        );
        this.logger.warn(
          `📊 Model hiện tại: ${status.currentModel}, Models tìm thấy trong DB: ${status.modelsFound.join(', ')}`,
        );

        // Start regeneration in background
        this.startBackgroundRegeneration();
      } else {
        this.logger.log(
          `✅ Tất cả ${status.totalEmbeddings} embeddings đều đang sử dụng model ${status.currentModel}`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Lỗi khi kiểm tra tính nhất quán embedding:', error);
    }
  }

  /**
   * Check if embedding model has changed and if regeneration is required
   */
  async checkEmbeddingModelConsistency(): Promise<EmbeddingMigrationStatus> {
    const currentModel = this.embeddingService.getModelName();

    // Get all distinct models used in existing embeddings
    const modelsInDb = await this.prisma.documentEmbedding.groupBy({
      by: ['model'],
      _count: {
        model: true,
      },
    });

    const modelsFound = modelsInDb.map(m => m.model);
    const totalEmbeddings = modelsInDb.reduce(
      (sum, m) => sum + m._count.model,
      0,
    );

    // Count embeddings that are not using the current model
    const outdatedCount = await this.prisma.documentEmbedding.count({
      where: {
        model: {
          not: currentModel,
        },
      },
    });

    return {
      totalEmbeddings,
      outdatedEmbeddings: outdatedCount,
      currentModel,
      isRegenerationRequired: outdatedCount > 0,
      modelsFound,
    };
  }

  /**
   * Start background regeneration of all outdated embeddings
   */
  private async startBackgroundRegeneration() {
    if (this.isRegenerating) {
      this.logger.warn('⚠️ Regeneration đang chạy, bỏ qua yêu cầu mới');
      return;
    }

    this.isRegenerating = true;
    const currentModel = this.embeddingService.getModelName();

    this.logger.log(
      `🔄 Bắt đầu regenerate embeddings sang model ${currentModel}...`,
    );

    try {
      // Get all outdated embeddings
      const outdatedEmbeddings = await this.prisma.documentEmbedding.findMany({
        where: {
          model: {
            not: currentModel,
          },
        },
        select: {
          documentId: true,
          model: true,
        },
      });

      this.regenerationProgress = {
        total: outdatedEmbeddings.length,
        completed: 0,
        failed: 0,
        percentage: 0,
      };

      this.logger.log(
        `📦 Cần regenerate ${outdatedEmbeddings.length} embeddings`,
      );

      // Process in batches to avoid overloading
      const batchSize = 5;
      for (let i = 0; i < outdatedEmbeddings.length; i += batchSize) {
        const batch = outdatedEmbeddings.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async embedding => {
            try {
              await this.regenerateEmbeddingForDocument(embedding.documentId);
              this.regenerationProgress.completed++;
            } catch (error) {
              this.regenerationProgress.failed++;
              this.logger.error(
                `❌ Lỗi regenerate embedding cho document ${embedding.documentId}:`,
                error.message,
              );
            }
          }),
        );

        this.regenerationProgress.percentage = Math.round(
          ((this.regenerationProgress.completed +
            this.regenerationProgress.failed) /
            this.regenerationProgress.total) *
            100,
        );

        this.logger.log(
          `📈 Tiến độ: ${this.regenerationProgress.percentage}% (${this.regenerationProgress.completed} thành công, ${this.regenerationProgress.failed} thất bại)`,
        );

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < outdatedEmbeddings.length) {
          await this.sleep(1000);
        }
      }

      this.logger.log(
        `✅ Hoàn thành regenerate embeddings: ${this.regenerationProgress.completed} thành công, ${this.regenerationProgress.failed} thất bại`,
      );
    } catch (error) {
      this.logger.error('❌ Lỗi trong quá trình regenerate embeddings:', error);
    } finally {
      this.isRegenerating = false;
    }
  }

  /**
   * Regenerate embedding for a specific document
   */
  private async regenerateEmbeddingForDocument(
    documentId: string,
  ): Promise<void> {
    const currentModel = this.embeddingService.getModelName();

    // Get document with AI analysis
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        aiAnalysis: true,
      },
    });

    if (!document) {
      throw new Error(`Document ${documentId} không tồn tại`);
    }

    // Create embedding text from document content
    const embeddingParts: string[] = [];

    if (document.title) {
      embeddingParts.push(`Title: ${document.title}`);
    }

    if (document.description) {
      embeddingParts.push(`Description: ${document.description}`);
    }

    if (document.tags && document.tags.length > 0) {
      embeddingParts.push(`Tags: ${document.tags.join(', ')}`);
    }

    if (document.aiAnalysis) {
      if (document.aiAnalysis.summary) {
        embeddingParts.push(`Summary: ${document.aiAnalysis.summary}`);
      }

      if (
        document.aiAnalysis.keyPoints &&
        document.aiAnalysis.keyPoints.length > 0
      ) {
        embeddingParts.push(
          `Key Points: ${document.aiAnalysis.keyPoints.join('; ')}`,
        );
      }
    }

    const embeddingText = embeddingParts.join('\n\n');

    if (!embeddingText.trim()) {
      this.logger.warn(
        `Document ${documentId} không có nội dung để tạo embedding. Bỏ qua...`,
      );
      return;
    }

    // Generate new embedding with current model (strict mode - no fallback to placeholder)
    const embedding =
      await this.embeddingService.generateEmbeddingStrict(embeddingText);

    // Update embedding in database
    await this.prisma.documentEmbedding.update({
      where: { documentId },
      data: {
        embedding,
        model: currentModel,
        version: '1.0',
        updatedAt: new Date(),
      },
    });

    this.logger.debug(
      `✅ Đã regenerate embedding cho document ${documentId} với model ${currentModel}`,
    );
  }

  /**
   * Manually trigger regeneration of all embeddings (for admin use)
   */
  async regenerateAllEmbeddings(): Promise<{
    success: boolean;
    message: string;
    progress?: RegenerationProgress;
  }> {
    if (this.isRegenerating) {
      return {
        success: false,
        message: 'Regeneration đang chạy',
        progress: this.regenerationProgress,
      };
    }

    // Start regeneration in background
    this.startBackgroundRegeneration();

    return {
      success: true,
      message: 'Đã bắt đầu regenerate tất cả embeddings',
      progress: this.regenerationProgress,
    };
  }

  /**
   * Force regeneration of all embeddings regardless of model (for admin use)
   */
  async forceRegenerateAllEmbeddings(): Promise<{
    success: boolean;
    message: string;
    progress?: RegenerationProgress;
  }> {
    if (this.isRegenerating) {
      return {
        success: false,
        message: 'Regeneration đang chạy',
        progress: this.regenerationProgress,
      };
    }

    this.isRegenerating = true;
    const currentModel = this.embeddingService.getModelName();

    this.logger.log(
      `🔄 Bắt đầu force regenerate TẤT CẢ embeddings sang model ${currentModel}...`,
    );

    try {
      // Get all embeddings
      const allEmbeddings = await this.prisma.documentEmbedding.findMany({
        select: {
          documentId: true,
          model: true,
        },
      });

      this.regenerationProgress = {
        total: allEmbeddings.length,
        completed: 0,
        failed: 0,
        percentage: 0,
      };

      this.logger.log(`📦 Cần regenerate ${allEmbeddings.length} embeddings`);

      // Process in batches
      const batchSize = 5;
      for (let i = 0; i < allEmbeddings.length; i += batchSize) {
        const batch = allEmbeddings.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async embedding => {
            try {
              await this.regenerateEmbeddingForDocument(embedding.documentId);
              this.regenerationProgress.completed++;
            } catch (error) {
              this.regenerationProgress.failed++;
              this.logger.error(
                `❌ Lỗi regenerate embedding cho document ${embedding.documentId}:`,
                error.message,
              );
            }
          }),
        );

        this.regenerationProgress.percentage = Math.round(
          ((this.regenerationProgress.completed +
            this.regenerationProgress.failed) /
            this.regenerationProgress.total) *
            100,
        );

        this.logger.log(
          `📈 Tiến độ: ${this.regenerationProgress.percentage}% (${this.regenerationProgress.completed} thành công, ${this.regenerationProgress.failed} thất bại)`,
        );

        // Small delay between batches
        if (i + batchSize < allEmbeddings.length) {
          await this.sleep(1000);
        }
      }

      this.logger.log(
        `✅ Hoàn thành force regenerate embeddings: ${this.regenerationProgress.completed} thành công, ${this.regenerationProgress.failed} thất bại`,
      );

      return {
        success: true,
        message: `Đã regenerate ${this.regenerationProgress.completed}/${this.regenerationProgress.total} embeddings`,
        progress: this.regenerationProgress,
      };
    } catch (error) {
      this.logger.error(
        '❌ Lỗi trong quá trình force regenerate embeddings:',
        error,
      );
      return {
        success: false,
        message: `Lỗi: ${error.message}`,
        progress: this.regenerationProgress,
      };
    } finally {
      this.isRegenerating = false;
    }
  }

  /**
   * Get current regeneration progress
   */
  getRegenerationProgress(): {
    isRunning: boolean;
    progress: RegenerationProgress;
  } {
    return {
      isRunning: this.isRegenerating,
      progress: this.regenerationProgress,
    };
  }

  /**
   * Get embedding model status
   */
  async getEmbeddingModelStatus(): Promise<EmbeddingMigrationStatus> {
    return this.checkEmbeddingModelConsistency();
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
