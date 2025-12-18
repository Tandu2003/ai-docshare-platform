import * as crypto from 'crypto';
import { cosineSimilarity } from '@/common';
import { Injectable, Logger } from '@nestjs/common';

/** Text similarity weight configuration */
interface TextWeights {
  readonly jaccard: number;
  readonly levenshtein: number;
}

/** Combined score weight configuration */
interface CombinedWeights {
  readonly hash: number;
  readonly text: number;
  readonly embedding: number;
}

/** Score breakdown for detailed results */
interface ScoreBreakdown {
  readonly hashSimilarity: number;
  readonly textSimilarity: number;
  readonly embeddingSimilarity: number;
  readonly jaccardScore: number;
  readonly levenshteinScore: number;
}

/** Similar text segment */
interface SimilarSegment {
  readonly sourceText: string;
  readonly targetText: string;
  readonly similarity: number;
  readonly sourcePosition: { start: number; end: number };
  readonly targetPosition: { start: number; end: number };
}

/** Detailed similarity result */
interface DetailedSimilarityResult {
  readonly finalScore: number;
  readonly breakdown: ScoreBreakdown;
  readonly dominantType: 'hash' | 'text' | 'embedding';
  readonly explanation: string;
  readonly similarSegments: SimilarSegment[];
}

/** Default weights */
const DEFAULT_TEXT_WEIGHTS: TextWeights = { jaccard: 0.6, levenshtein: 0.4 };
const DEFAULT_COMBINED_WEIGHTS: CombinedWeights = {
  hash: 0.4,
  text: 0.3,
  embedding: 0.3,
};

@Injectable()
export class SimilarityAlgorithmService {
  private readonly logger = new Logger(SimilarityAlgorithmService.name);

  /**
   * Calculate cosine similarity between two vectors.
   * @deprecated Use `cosineSimilarity` from `@/common` instead for consistency.
   */
  calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    return cosineSimilarity(vecA, vecB);
  }

  /**
   * Calculate text similarity with configurable weights.
   */
  calculateTextSimilarity(
    text1: string,
    text2: string,
    weights: TextWeights = DEFAULT_TEXT_WEIGHTS,
  ): number {
    if (!text1 || !text2) return 0;
    if (text1 === text2) return 1.0;

    const MAX_LENGTH = 3000;
    const limited1 = text1.substring(0, MAX_LENGTH);
    const limited2 = text2.substring(0, MAX_LENGTH);

    const normalized1 = limited1.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalized2 = limited2.toLowerCase().replace(/\s+/g, ' ').trim();

    if (normalized1 === normalized2) return 1.0;

    const jaccard = this.calculateJaccardSimilarity(normalized1, normalized2);
    const levenshteinSimilarity = this.calculateLevenshteinSimilarity(
      normalized1,
      normalized2,
      jaccard,
    );

    return (
      jaccard * weights.jaccard + levenshteinSimilarity * weights.levenshtein
    );
  }

  private calculateJaccardSimilarity(text1: string, text2: string): number {
    const words1 = text1.split(/\s+/).slice(0, 500);
    const words2 = text2.split(/\s+/).slice(0, 500);
    const words1Set = new Set(words1);
    const words2Set = new Set(words2);

    let intersection = 0;
    for (const word of words1Set) {
      if (words2Set.has(word)) intersection++;
    }

    const union = new Set([...words1Set, ...words2Set]);
    return union.size > 0 ? intersection / union.size : 0;
  }

  private calculateLevenshteinSimilarity(
    text1: string,
    text2: string,
    fallbackValue: number,
  ): number {
    if (text1.length < 1000 && text2.length < 1000) {
      const distance = this.levenshteinDistance(text1, text2);
      const maxLength = Math.max(text1.length, text2.length);
      return maxLength > 0 ? 1 - distance / maxLength : 0;
    }
    return fallbackValue;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = [];

    for (let i = 0; i <= m; i++) {
      dp[i] = [i];
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + 1,
          );
        }
      }
    }

    return dp[m][n];
  }

  hashText(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  compareFileHashes(sourceFiles: any[], targetFiles: any[]): number {
    if (sourceFiles.length === 0 || targetFiles.length === 0) return 0;

    const sourceHashes = new Set(
      sourceFiles.map(f => f.fileHash).filter(Boolean),
    );
    const targetHashes = new Set(
      targetFiles.map(f => f.fileHash).filter(Boolean),
    );

    if (sourceHashes.size === 0 || targetHashes.size === 0) return 0;

    let matches = 0;
    for (const hash of sourceHashes) {
      if (targetHashes.has(hash)) {
        matches++;
      }
    }

    if (matches === sourceHashes.size && matches === targetHashes.size) {
      return 1.0;
    }

    return matches / Math.max(sourceHashes.size, targetHashes.size);
  }

  /**
   * Calculate combined similarity score using configurable weights.
   * Formula: max(weighted_sum, individual_scores)
   */
  calculateCombinedScore(
    hashSimilarity: number,
    textSimilarity: number,
    embeddingSimilarity: number,
    weights: CombinedWeights = DEFAULT_COMBINED_WEIGHTS,
  ): number {
    return Math.max(
      hashSimilarity * weights.hash +
        textSimilarity * weights.text +
        embeddingSimilarity * weights.embedding,
      hashSimilarity,
      textSimilarity,
      embeddingSimilarity,
    );
  }

  /**
   * Calculate detailed similarity with full breakdown.
   */
  calculateDetailedSimilarity(
    sourceText: string,
    targetText: string,
    hashSimilarity: number,
    embeddingSimilarity: number,
    textWeights: TextWeights = DEFAULT_TEXT_WEIGHTS,
    combinedWeights: CombinedWeights = DEFAULT_COMBINED_WEIGHTS,
  ): DetailedSimilarityResult {
    const normalized1 = sourceText.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalized2 = targetText.toLowerCase().replace(/\s+/g, ' ').trim();

    const jaccardScore = this.calculateJaccardSimilarity(
      normalized1,
      normalized2,
    );
    const levenshteinScore = this.calculateLevenshteinSimilarity(
      normalized1,
      normalized2,
      jaccardScore,
    );
    const textSimilarity =
      jaccardScore * textWeights.jaccard +
      levenshteinScore * textWeights.levenshtein;

    const finalScore = this.calculateCombinedScore(
      hashSimilarity,
      textSimilarity,
      embeddingSimilarity,
      combinedWeights,
    );

    const breakdown: ScoreBreakdown = {
      hashSimilarity,
      textSimilarity,
      embeddingSimilarity,
      jaccardScore,
      levenshteinScore,
    };

    const dominantType = this.identifyDominantType(breakdown);
    const explanation = this.generateExplanation(
      breakdown,
      dominantType,
      finalScore,
    );
    const similarSegments = this.findSimilarSegments(sourceText, targetText);

    return {
      finalScore,
      breakdown,
      dominantType,
      explanation,
      similarSegments,
    };
  }

  /**
   * Identify which similarity type contributed most.
   */
  identifyDominantType(
    breakdown: ScoreBreakdown,
  ): 'hash' | 'text' | 'embedding' {
    const { hashSimilarity, textSimilarity, embeddingSimilarity } = breakdown;
    if (
      hashSimilarity >= textSimilarity &&
      hashSimilarity >= embeddingSimilarity
    ) {
      return 'hash';
    }
    if (embeddingSimilarity >= textSimilarity) {
      return 'embedding';
    }
    return 'text';
  }

  /**
   * Generate human-readable explanation for similarity.
   */
  generateExplanation(
    breakdown: ScoreBreakdown,
    dominantType: 'hash' | 'text' | 'embedding',
    finalScore: number,
  ): string {
    const percentage = Math.round(finalScore * 100);
    const explanations: Record<string, string> = {
      hash: `Documents are ${percentage}% similar, primarily due to identical file content (hash match: ${Math.round(breakdown.hashSimilarity * 100)}%).`,
      text: `Documents are ${percentage}% similar, primarily due to similar text content (Jaccard: ${Math.round(breakdown.jaccardScore * 100)}%, Levenshtein: ${Math.round(breakdown.levenshteinScore * 100)}%).`,
      embedding: `Documents are ${percentage}% similar, primarily due to semantic similarity (embedding match: ${Math.round(breakdown.embeddingSimilarity * 100)}%).`,
    };
    return explanations[dominantType];
  }

  /**
   * Find similar text segments between two documents.
   */
  findSimilarSegments(
    sourceText: string,
    targetText: string,
    minSimilarity = 0.7,
    segmentSize = 200,
  ): SimilarSegment[] {
    const segments: SimilarSegment[] = [];
    const sourceSegments = this.splitIntoSegments(sourceText, segmentSize);
    const targetSegments = this.splitIntoSegments(targetText, segmentSize);

    for (const source of sourceSegments) {
      for (const target of targetSegments) {
        const similarity = this.calculateJaccardSimilarity(
          source.text.toLowerCase(),
          target.text.toLowerCase(),
        );
        if (similarity >= minSimilarity) {
          segments.push({
            sourceText: source.text,
            targetText: target.text,
            similarity,
            sourcePosition: { start: source.start, end: source.end },
            targetPosition: { start: target.start, end: target.end },
          });
        }
      }
    }

    return segments.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  }

  private splitIntoSegments(
    text: string,
    segmentSize: number,
  ): Array<{ text: string; start: number; end: number }> {
    const segments: Array<{ text: string; start: number; end: number }> = [];
    for (let i = 0; i < text.length; i += segmentSize / 2) {
      const end = Math.min(i + segmentSize, text.length);
      segments.push({
        text: text.substring(i, end),
        start: i,
        end,
      });
    }
    return segments;
  }

  /** Get Jaccard score directly (for testing) */
  getJaccardScore(text1: string, text2: string): number {
    return this.calculateJaccardSimilarity(text1, text2);
  }

  /** Get Levenshtein score directly (for testing) */
  getLevenshteinScore(text1: string, text2: string): number {
    return this.calculateLevenshteinSimilarity(text1, text2, 0);
  }
}

export {
  TextWeights,
  CombinedWeights,
  ScoreBreakdown,
  SimilarSegment,
  DetailedSimilarityResult,
  DEFAULT_TEXT_WEIGHTS,
  DEFAULT_COMBINED_WEIGHTS,
};
