/**
 * Language utility functions for converting language codes to display names
 */

export interface LanguageOption {
  code: string;
  name: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', name: 'Tiếng Anh' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'es', name: 'Tiếng Tây Ban Nha' },
  { code: 'fr', name: 'Tiếng Pháp' },
  { code: 'de', name: 'Tiếng Đức' },
  { code: 'zh', name: 'Tiếng Trung' },
  { code: 'ja', name: 'Tiếng Nhật' },
  { code: 'ko', name: 'Tiếng Hàn' },
];

/**
 * Convert language code to display name
 * @param code - Language code (e.g., 'en', 'vi')
 * @returns Language display name (e.g., 'English', 'Vietnamese')
 */
export function getLanguageName(code: string): string {
  const language = LANGUAGE_OPTIONS.find(lang => lang.code === code);
  return language?.name || code.toUpperCase();
}

/**
 * Get all available language codes
 * @returns Array of language codes
 */
export function getLanguageCodes(): string[] {
  return LANGUAGE_OPTIONS.map(lang => lang.code);
}

/**
 * Get language options for select components
 * @returns Array of language options with code and name
 */
export function getLanguageOptions(): LanguageOption[] {
  return LANGUAGE_OPTIONS;
}
