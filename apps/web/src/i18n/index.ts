import { createContext, useContext } from 'react';
import en from './locales/en.json';
import ru from './locales/ru.json';

export type Language = 'en' | 'ru';

const locales: Record<Language, any> = { en, ru };

export const LANGUAGES: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
];

function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((acc, part) => acc?.[part], obj) || path;
}

export function createTranslator(lang: Language) {
  return function t(key: string, params?: Record<string, string | number>): string {
    let text = getNestedValue(locales[lang], key) || getNestedValue(locales.en, key) || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{{${k}}}`, String(v));
      });
    }
    return text;
  };
}

export interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

export function useTranslation() {
  return useContext(I18nContext);
}
