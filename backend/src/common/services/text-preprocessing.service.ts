import { Injectable, Logger } from '@nestjs/common';

/** Options for text preprocessing */
interface PreprocessingOptions {
  readonly removeStopwords?: boolean;
  readonly normalize?: boolean;
  readonly removeDiacritics?: boolean;
  readonly language?: 'vi' | 'en' | 'auto';
}

/** Result of text preprocessing */
interface PreprocessedResult {
  readonly text: string;
  readonly originalLength: number;
  readonly processedLength: number;
  readonly detectedLanguage: 'vi' | 'en' | 'unknown';
  readonly tokens: string[];
}

/** LRU Cache entry */
interface CacheEntry {
  readonly result: PreprocessedResult;
  readonly timestamp: number;
}

@Injectable()
export class TextPreprocessingService {
  private readonly logger = new Logger(TextPreprocessingService.name);

  /** Vietnamese stopwords - common words that don't carry meaning */
  private readonly vietnameseStopwords = new Set([
    'và',
    'của',
    'là',
    'có',
    'được',
    'cho',
    'trong',
    'với',
    'này',
    'đã',
    'các',
    'những',
    'một',
    'để',
    'không',
    'từ',
    'như',
    'khi',
    'về',
    'theo',
    'trên',
    'đến',
    'còn',
    'cũng',
    'bị',
    'hay',
    'hoặc',
    'nếu',
    'thì',
    'mà',
    'vì',
    'do',
    'nên',
    'tại',
    'bởi',
    'sau',
    'trước',
    'giữa',
    'qua',
    'lại',
    'ra',
    'vào',
    'lên',
    'xuống',
    'đây',
    'đó',
    'kia',
    'nào',
    'gì',
    'ai',
    'sao',
    'thế',
    'rất',
    'quá',
    'hơn',
    'nhất',
    'cả',
    'mọi',
    'tất',
    'chỉ',
    'riêng',
  ]);

  /** English stopwords - common words that don't carry meaning */
  private readonly englishStopwords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'as',
    'is',
    'was',
    'are',
    'were',
    'been',
    'be',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'can',
    'need',
    'dare',
    'ought',
    'used',
    'it',
    'its',
    'this',
    'that',
    'these',
    'those',
    'i',
    'you',
    'he',
    'she',
    'we',
    'they',
    'what',
    'which',
    'who',
    'whom',
    'whose',
    'where',
    'when',
    'why',
    'how',
    'all',
    'each',
    'every',
    'both',
    'few',
    'more',
    'most',
    'other',
    'some',
    'such',
    'no',
    'nor',
    'not',
    'only',
    'own',
    'same',
    'so',
    'than',
    'too',
    'very',
    'just',
    'also',
  ]);

  /** Vietnamese diacritics mapping to ASCII */
  private readonly diacriticsMap: Record<string, string> = {
    à: 'a',
    á: 'a',
    ả: 'a',
    ã: 'a',
    ạ: 'a',
    ă: 'a',
    ằ: 'a',
    ắ: 'a',
    ẳ: 'a',
    ẵ: 'a',
    ặ: 'a',
    â: 'a',
    ầ: 'a',
    ấ: 'a',
    ẩ: 'a',
    ẫ: 'a',
    ậ: 'a',
    è: 'e',
    é: 'e',
    ẻ: 'e',
    ẽ: 'e',
    ẹ: 'e',
    ê: 'e',
    ề: 'e',
    ế: 'e',
    ể: 'e',
    ễ: 'e',
    ệ: 'e',
    ì: 'i',
    í: 'i',
    ỉ: 'i',
    ĩ: 'i',
    ị: 'i',
    ò: 'o',
    ó: 'o',
    ỏ: 'o',
    õ: 'o',
    ọ: 'o',
    ô: 'o',
    ồ: 'o',
    ố: 'o',
    ổ: 'o',
    ỗ: 'o',
    ộ: 'o',
    ơ: 'o',
    ờ: 'o',
    ớ: 'o',
    ở: 'o',
    ỡ: 'o',
    ợ: 'o',
    ù: 'u',
    ú: 'u',
    ủ: 'u',
    ũ: 'u',
    ụ: 'u',
    ư: 'u',
    ừ: 'u',
    ứ: 'u',
    ử: 'u',
    ữ: 'u',
    ự: 'u',
    ỳ: 'y',
    ý: 'y',
    ỷ: 'y',
    ỹ: 'y',
    ỵ: 'y',
    đ: 'd',
    À: 'A',
    Á: 'A',
    Ả: 'A',
    Ã: 'A',
    Ạ: 'A',
    Ă: 'A',
    Ằ: 'A',
    Ắ: 'A',
    Ẳ: 'A',
    Ẵ: 'A',
    Ặ: 'A',
    Â: 'A',
    Ầ: 'A',
    Ấ: 'A',
    Ẩ: 'A',
    Ẫ: 'A',
    Ậ: 'A',
    È: 'E',
    É: 'E',
    Ẻ: 'E',
    Ẽ: 'E',
    Ẹ: 'E',
    Ê: 'E',
    Ề: 'E',
    Ế: 'E',
    Ể: 'E',
    Ễ: 'E',
    Ệ: 'E',
    Ì: 'I',
    Í: 'I',
    Ỉ: 'I',
    Ĩ: 'I',
    Ị: 'I',
    Ò: 'O',
    Ó: 'O',
    Ỏ: 'O',
    Õ: 'O',
    Ọ: 'O',
    Ô: 'O',
    Ồ: 'O',
    Ố: 'O',
    Ổ: 'O',
    Ỗ: 'O',
    Ộ: 'O',
    Ơ: 'O',
    Ờ: 'O',
    Ớ: 'O',
    Ở: 'O',
    Ỡ: 'O',
    Ợ: 'O',
    Ù: 'U',
    Ú: 'U',
    Ủ: 'U',
    Ũ: 'U',
    Ụ: 'U',
    Ư: 'U',
    Ừ: 'U',
    Ứ: 'U',
    Ử: 'U',
    Ữ: 'U',
    Ự: 'U',
    Ỳ: 'Y',
    Ý: 'Y',
    Ỷ: 'Y',
    Ỹ: 'Y',
    Ỵ: 'Y',
    Đ: 'D',
  };

  /** LRU cache for preprocessed results */
  private readonly cache = new Map<string, CacheEntry>();
  private readonly maxCacheSize = 1000;
  private readonly cacheTtlMs = 300000; // 5 minutes

  /**
   * Preprocess text with configurable options.
   * Returns original text on any failure.
   */
  preprocess(
    text: string,
    options: PreprocessingOptions = {},
  ): PreprocessedResult {
    const originalLength = text.length;
    const cacheKey = this.generateCacheKey(text, options);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    try {
      const {
        removeStopwords = true,
        normalize = true,
        removeDiacritics = false,
        language = 'auto',
      } = options;
      let processedText = text;
      const detectedLanguage =
        language === 'auto' ? this.detectLanguage(text) : language;
      if (normalize) {
        processedText = this.normalize(processedText);
      }
      if (removeDiacritics) {
        processedText = this.removeDiacritics(processedText);
      }
      if (removeStopwords && detectedLanguage !== 'unknown') {
        processedText = this.removeStopwords(processedText, detectedLanguage);
      }
      const tokens = this.tokenize(processedText);
      const result: PreprocessedResult = {
        text: processedText,
        originalLength,
        processedLength: processedText.length,
        detectedLanguage,
        tokens,
      };
      this.addToCache(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.warn(
        `Preprocessing failed, returning original text: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        text,
        originalLength,
        processedLength: text.length,
        detectedLanguage: 'unknown',
        tokens: text.split(/\s+/).filter(Boolean),
      };
    }
  }

  /**
   * Normalize text: lowercase, remove special characters, preserve word boundaries.
   */
  normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Remove stopwords from text based on language.
   */
  removeStopwords(text: string, language: 'vi' | 'en'): string {
    const stopwords =
      language === 'vi' ? this.vietnameseStopwords : this.englishStopwords;
    const words = text.split(/\s+/);
    const filtered = words.filter(word => !stopwords.has(word.toLowerCase()));
    return filtered.join(' ');
  }

  /**
   * Remove Vietnamese diacritics, converting to ASCII equivalents.
   */
  removeDiacritics(text: string): string {
    let result = '';
    for (const char of text) {
      result += this.diacriticsMap[char] ?? char;
    }
    return result;
  }

  /**
   * Tokenize text into words.
   */
  tokenize(text: string): string[] {
    return text.split(/\s+/).filter(word => word.length > 0);
  }

  /**
   * Detect language based on character patterns.
   * Vietnamese has specific diacritics that English doesn't have.
   */
  detectLanguage(text: string): 'vi' | 'en' | 'unknown' {
    if (!text || text.trim().length === 0) {
      return 'unknown';
    }
    const vietnamesePattern =
      /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
    if (vietnamesePattern.test(text)) {
      return 'vi';
    }
    const words = text.toLowerCase().split(/\s+/);
    let viCount = 0;
    let enCount = 0;
    for (const word of words) {
      if (this.vietnameseStopwords.has(word)) viCount++;
      if (this.englishStopwords.has(word)) enCount++;
    }
    if (viCount > enCount && viCount > 2) return 'vi';
    if (enCount > viCount && enCount > 2) return 'en';
    if (enCount > 0) return 'en';
    return 'unknown';
  }

  /** Get Vietnamese stopwords set (for testing) */
  getVietnameseStopwords(): Set<string> {
    return this.vietnameseStopwords;
  }

  /** Get English stopwords set (for testing) */
  getEnglishStopwords(): Set<string> {
    return this.englishStopwords;
  }

  private generateCacheKey(
    text: string,
    options: PreprocessingOptions,
  ): string {
    const optStr = JSON.stringify(options);
    return `${text.substring(0, 100)}_${text.length}_${optStr}`;
  }

  private getFromCache(key: string): PreprocessedResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.cacheTtlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.result;
  }

  private addToCache(key: string, result: PreprocessedResult): void {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { result, timestamp: Date.now() });
  }

  /** Clear cache (for testing) */
  clearCache(): void {
    this.cache.clear();
  }
}
