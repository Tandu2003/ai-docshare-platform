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
export function getLanguageName(code: string): string {
  const language = LANGUAGE_OPTIONS.find(lang => lang.code === code);
  return language?.name || code.toUpperCase();
}

export function getLanguageCodes(): string[] {
  return LANGUAGE_OPTIONS.map(lang => lang.code);
}

export function getLanguageOptions(): LanguageOption[] {
  return LANGUAGE_OPTIONS;
}
