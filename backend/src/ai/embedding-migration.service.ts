import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import { NotFoundError } from '@/common';
import { EmbeddingStorageService } from '@/common/services/embedding-storage.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
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
    private readonly embeddingStorage: EmbeddingStorageService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const autoMigrate =
      this.configService.get<string>('EMBEDDING_AUTO_MIGRATE') !== 'false';

    if (!autoMigrate) {
      return;
    }

    if (!this.embeddingService.isConfigured()) {
      return;
    }

    try {
      const status = await this.checkEmbeddingModelConsistency();

      if (status.isRegenerationRequired) {
        void this.startBackgroundRegeneration();
      }
    } catch {
      // Silent error handling
    }
  }

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

  private async startBackgroundRegeneration() {
    if (this.isRegenerating) {
      return;
    }

    this.isRegenerating = true;
    const currentModel = this.embeddingService.getModelName();

    try {
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

      const batchSize = 5;
      for (let i = 0; i < outdatedEmbeddings.length; i += batchSize) {
        const batch = outdatedEmbeddings.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async embedding => {
            try {
              await this.regenerateEmbeddingForDocument(embedding.documentId);
              this.regenerationProgress.completed++;
            } catch {
              this.regenerationProgress.failed++;
            }
          }),
        );

        this.regenerationProgress.percentage = Math.round(
          ((this.regenerationProgress.completed +
            this.regenerationProgress.failed) /
            this.regenerationProgress.total) *
            100,
        );

        if (i + batchSize < outdatedEmbeddings.length) {
          await this.sleep(1000);
        }
      }
    } catch {
      // Silent error handling
    } finally {
      this.isRegenerating = false;
    }
  }

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
      throw new NotFoundError(`Document ${documentId} không tồn tại`);
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
      return;
    }

    let embedding: number[];
    try {
      embedding =
        await this.embeddingService.generateEmbeddingStrict(embeddingText);
    } catch {
      embedding = await this.embeddingService.generateEmbedding(embeddingText);
    }

    await this.embeddingStorage.saveEmbedding(
      documentId,
      embedding,
      currentModel,
      '1.0',
    );
  }

  regenerateAllEmbeddings(): {
    success: boolean;
    message: string;
    progress?: RegenerationProgress;
  } {
    if (this.isRegenerating) {
      return {
        success: false,
        message: 'Regeneration đang chạy',
        progress: this.regenerationProgress,
      };
    }

    // Start regeneration in background
    void this.startBackgroundRegeneration();

    return {
      success: true,
      message: 'Đã bắt đầu regenerate tất cả embeddings',
      progress: this.regenerationProgress,
    };
  }

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

    try {
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

      const batchSize = 5;
      for (let i = 0; i < allEmbeddings.length; i += batchSize) {
        const batch = allEmbeddings.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async embedding => {
            try {
              await this.regenerateEmbeddingForDocument(embedding.documentId);
              this.regenerationProgress.completed++;
            } catch {
              this.regenerationProgress.failed++;
            }
          }),
        );

        this.regenerationProgress.percentage = Math.round(
          ((this.regenerationProgress.completed +
            this.regenerationProgress.failed) /
            this.regenerationProgress.total) *
            100,
        );

        if (i + batchSize < allEmbeddings.length) {
          await this.sleep(1000);
        }
      }

      return {
        success: true,
        message: `Đã regenerate ${this.regenerationProgress.completed}/${this.regenerationProgress.total} embeddings`,
        progress: this.regenerationProgress,
      };
    } catch (error) {
      return {
        success: false,
        message: `Lỗi: ${(error as Error).message}`,
        progress: this.regenerationProgress,
      };
    } finally {
      this.isRegenerating = false;
    }
  }

  getRegenerationProgress(): {
    isRunning: boolean;
    progress: RegenerationProgress;
  } {
    return {
      isRunning: this.isRegenerating,
      progress: this.regenerationProgress,
    };
  }

  async getEmbeddingModelStatus(): Promise<EmbeddingMigrationStatus> {
    return this.checkEmbeddingModelConsistency();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
