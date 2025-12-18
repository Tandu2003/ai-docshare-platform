import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

/** Threshold configuration for similarity detection */
interface ThresholdConfig {
  readonly similarityDetection: number;
  readonly embeddingMatch: number;
  readonly hashMatch: number;
  readonly hashInclude: number;
}

/** Weight configuration for combined score calculation */
interface WeightConfig {
  readonly hash: number;
  readonly text: number;
  readonly embedding: number;
}

/** Text similarity weight configuration */
interface TextWeightConfig {
  readonly jaccard: number;
  readonly levenshtein: number;
}

/** Complete similarity configuration */
interface SimilarityConfig {
  readonly thresholds: ThresholdConfig;
  readonly weights: WeightConfig;
  readonly textWeights: TextWeightConfig;
}

/** Default configuration values */
const DEFAULT_CONFIG: SimilarityConfig = {
  thresholds: {
    similarityDetection: 0.85,
    embeddingMatch: 0.75,
    hashMatch: 0.95,
    hashInclude: 0.6,
  },
  weights: {
    hash: 0.4,
    text: 0.3,
    embedding: 0.3,
  },
  textWeights: {
    jaccard: 0.6,
    levenshtein: 0.4,
  },
};

/** Config key mappings for database */
const CONFIG_KEYS = {
  'similarity.threshold.detection': 'thresholds.similarityDetection',
  'similarity.threshold.embedding': 'thresholds.embeddingMatch',
  'similarity.threshold.hash': 'thresholds.hashMatch',
  'similarity.threshold.hashInclude': 'thresholds.hashInclude',
  'similarity.weights.hash': 'weights.hash',
  'similarity.weights.text': 'weights.text',
  'similarity.weights.embedding': 'weights.embedding',
  'similarity.textWeights.jaccard': 'textWeights.jaccard',
  'similarity.textWeights.levenshtein': 'textWeights.levenshtein',
} as const;

@Injectable()
export class SimilarityConfigService {
  private readonly logger = new Logger(SimilarityConfigService.name);
  private config: SimilarityConfig = { ...DEFAULT_CONFIG };
  private lastRefresh: Date = new Date(0);
  private readonly refreshIntervalMs = 60000;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get current similarity configuration.
   * Auto-refreshes from database if stale.
   */
  async getConfig(): Promise<SimilarityConfig> {
    const now = new Date();
    if (now.getTime() - this.lastRefresh.getTime() > this.refreshIntervalMs) {
      await this.refreshConfig();
    }
    return this.config;
  }

  /**
   * Refresh configuration from database.
   * Falls back to defaults if database unavailable.
   */
  async refreshConfig(): Promise<void> {
    try {
      const settings = await this.prisma.systemSetting.findMany({
        where: {
          key: { startsWith: 'similarity.' },
        },
      });
      const newConfig = this.buildConfigFromSettings(settings);
      if (this.validateConfig(newConfig)) {
        this.config = newConfig;
      } else {
        this.logger.warn('Invalid config from database, using defaults');
        this.config = { ...DEFAULT_CONFIG };
      }
      this.lastRefresh = new Date();
    } catch (error) {
      this.logger.warn(
        `Failed to refresh config from database: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.config = { ...DEFAULT_CONFIG };
      this.lastRefresh = new Date();
    }
  }

  /**
   * Validate that a threshold value is between 0 and 1.
   */
  validateThreshold(value: number): boolean {
    return (
      typeof value === 'number' && value >= 0 && value <= 1 && !isNaN(value)
    );
  }

  /**
   * Validate that weights sum to 1.0 (with small tolerance for floating point).
   */
  validateWeights(weights: Record<string, number>): boolean {
    const values = Object.values(weights);
    if (values.some(v => typeof v !== 'number' || isNaN(v) || v < 0)) {
      return false;
    }
    const sum = values.reduce((acc, v) => acc + v, 0);
    return Math.abs(sum - 1.0) < 0.001;
  }

  /**
   * Validate complete configuration.
   */
  validateConfig(config: SimilarityConfig): boolean {
    const thresholdValues = Object.values(config.thresholds);
    if (!thresholdValues.every(v => this.validateThreshold(v))) {
      return false;
    }
    if (
      !this.validateWeights(config.weights as unknown as Record<string, number>)
    ) {
      return false;
    }
    if (
      !this.validateWeights(
        config.textWeights as unknown as Record<string, number>,
      )
    ) {
      return false;
    }
    return true;
  }

  /**
   * Update a specific configuration value in database.
   */
  async updateConfig(key: string, value: number): Promise<void> {
    if (!this.validateThreshold(value)) {
      throw new Error(`Invalid value for ${key}: must be between 0 and 1`);
    }
    await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: {
        key,
        value: String(value),
        type: 'number',
        category: 'similarity',
      },
    });
    await this.refreshConfig();
  }

  /** Get default configuration (for testing) */
  getDefaultConfig(): SimilarityConfig {
    return { ...DEFAULT_CONFIG };
  }

  private buildConfigFromSettings(
    settings: Array<{ key: string; value: string }>,
  ): SimilarityConfig {
    const config: SimilarityConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    for (const setting of settings) {
      const path = CONFIG_KEYS[setting.key as keyof typeof CONFIG_KEYS];
      if (path) {
        const value = parseFloat(setting.value);
        if (!isNaN(value)) {
          this.setNestedValue(config, path, value);
        }
      }
    }
    return config;
  }

  private setNestedValue(obj: any, path: string, value: number): void {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }

  /** Force refresh (for testing) */
  forceRefresh(): void {
    this.lastRefresh = new Date(0);
  }
}

export { SimilarityConfig, ThresholdConfig, WeightConfig, TextWeightConfig };
