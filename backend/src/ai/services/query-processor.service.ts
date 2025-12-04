/**
 * Query Processor Service
 *
 * Handles query preprocessing and normalization:
 * - Query tokenization
 * - Text normalization
 * - Query variants generation
 */

import { Injectable } from '@nestjs/common';

export interface QueryVariants {
  trimmed: string;
  normalized: string;
  lowerTrimmed: string;
  lowerNormalized: string;
  condensedTrimmed: string;
  condensedNormalized: string;
  tokens: string[];
  lowerTokens: string[];
  embeddingText: string;
}

@Injectable()
export class QueryProcessorService {
  /**
   * Prepare multiple query variants for comprehensive search
   */
  prepareQueryVariants(query: string): QueryVariants {
    const trimmed = query.trim();

    if (!trimmed) {
      return {
        trimmed: '',
        normalized: '',
        lowerTrimmed: '',
        lowerNormalized: '',
        condensedTrimmed: '',
        condensedNormalized: '',
        tokens: [],
        lowerTokens: [],
        embeddingText: '',
      };
    }

    const whitespaceNormalized = trimmed.replace(/\s+/g, ' ');

    const punctuationAsSpace = trimmed
      .replace(/[\u2013\u2014]/g, ' ')
      .replace(/["'`'""]/g, ' ')
      .replace(/[\p{P}\p{S}]+/gu, ' ');

    const tokens = punctuationAsSpace
      .split(/\s+/)
      .map(token => token.trim())
      .filter(token => token.length > 0);

    const lowerTokens = tokens.map(token => token.toLowerCase());

    const expandedTokens = this.expandTokens(lowerTokens);

    const normalized = expandedTokens.join(' ');
    const lowerTrimmed = trimmed.toLowerCase();
    const lowerNormalized = normalized.toLowerCase();
    const condensedTrimmed = lowerTrimmed.replace(/[^\p{L}\p{N}]/gu, '');
    const condensedNormalized = lowerNormalized.replace(/[^\p{L}\p{N}]/gu, '');

    const embeddingText = normalized || whitespaceNormalized || trimmed;

    return {
      trimmed,
      normalized,
      lowerTrimmed,
      lowerNormalized,
      condensedTrimmed,
      condensedNormalized,
      tokens,
      lowerTokens: expandedTokens,
      embeddingText,
    };
  }

  /**
   * Expand tokens with heuristics for better matching
   */
  private expandTokens(lowerTokens: string[]): string[] {
    const expandedTokens: string[] = [];
    const suffixHeuristics = ['js', 'ts', 'py', 'rb', 'go', 'net', 'sql', 'db'];

    const addToken = (token: string) => {
      if (!token) return;
      const trimmedToken = token.trim();
      if (!trimmedToken) return;
      if (!expandedTokens.includes(trimmedToken)) {
        expandedTokens.push(trimmedToken);
      }
    };

    lowerTokens.forEach(token => {
      if (!token) return;
      addToken(token);

      suffixHeuristics.forEach(suffix => {
        if (token.endsWith(suffix) && token.length > suffix.length) {
          addToken(token.slice(0, -suffix.length));
          addToken(suffix);
        }
      });

      const alphaNumericSplit = token
        .replace(/([0-9]+)([a-z]+)/gi, '$1 $2')
        .replace(/([a-z]+)([0-9]+)/gi, '$1 $2');
      alphaNumericSplit.split(/\s+/).forEach(part => {
        if (part && part !== token) {
          addToken(part);
        }
      });
    });

    return expandedTokens;
  }

  /**
   * Create condensed version of text for matching
   */
  condense(value: string): string {
    return value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  }

  /**
   * Calculate token coverage in source text
   */
  calculateTokenCoverage(source: string, tokens: string[]): number {
    if (tokens.length === 0) return 0;
    const lowerSource = source.toLowerCase();
    return (
      tokens.filter(token => lowerSource.includes(token)).length / tokens.length
    );
  }
}
