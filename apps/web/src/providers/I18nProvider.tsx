import { useState, useMemo, ReactNode } from 'react';
import { I18nContext, Language, createTranslator } from '../i18n';

function getInitialLanguage(): Language {
  const saved = localStorage.getItem('app-language');
  if (saved && ['en', 'ru'].includes(saved)) return saved as Language;
  const browserLang = navigator.language.slice(0, 2);
  if (browserLang === 'ru') return 'ru';
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
  };

  const t = useMemo(() => createTranslator(language), [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}
