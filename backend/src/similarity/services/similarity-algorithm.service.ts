import * as crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SimilarityAlgorithmService {
  private readonly logger = new Logger(SimilarityAlgorithmService.name);
  calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      this.logger.warn(
        `Vector length mismatch: ${vecA.length} vs ${vecB.length}. Returning 0 similarity.`,
      );
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  calculateTextSimilarity(text1: string, text2: string): number {
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

    return jaccard * 0.7 + levenshteinSimilarity * 0.3;
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

  calculateCombinedScore(
    hashSimilarity: number,
    textSimilarity: number,
    embeddingSimilarity: number,
  ): number {
    return Math.max(
      hashSimilarity * 0.3 + textSimilarity * 0.2 + embeddingSimilarity * 0.5,
      hashSimilarity,
      textSimilarity,
      embeddingSimilarity,
    );
  }
}
