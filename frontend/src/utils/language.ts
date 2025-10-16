/**
 * Language utility functions for converting language codes to display names
 */

export interface LanguageOption {
  code: string;
  name: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
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
