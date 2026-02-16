import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from '../components/icons';
import { useTranslation } from '../i18n';
import type { Language } from '../i18n';
import { useTelegram } from '../providers/TelegramProvider';
import { cn } from '../lib/utils';

const LANG_OPTIONS: { code: Language; flag: string; native: string; english: string }[] = [
  { code: 'en', flag: '🇬🇧', native: 'English', english: 'English' },
  { code: 'ru', flag: '🇷🇺', native: 'Русский', english: 'Russian' },
];

export function LanguageSettingsPage() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useTranslation();
  const { hapticFeedback } = useTelegram();

  const handleSelect = (lang: Language) => {
    if (lang !== language) {
      hapticFeedback('impact');
      setLanguage(lang);
    }
  };

  return (
    <div className="min-h-full pb-24 page-enter">
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">{t('language.title')}</h1>
        </div>
      </div>

      <div className="px-4 space-y-3">
        <p className="text-[13px] text-[#666] mb-1">{t('language.select')}</p>

        {LANG_OPTIONS.map((lang) => {
          const isSelected = language === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300',
                isSelected
                  ? 'bg-white shadow-lg shadow-white/5'
                  : 'bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#333] active:scale-[0.98]'
              )}
            >
              <span className="text-3xl leading-none">{lang.flag}</span>

              <div className="flex-1 text-left">
                <p className={cn(
                  'text-[16px] font-semibold transition-colors duration-300',
                  isSelected ? 'text-black' : 'text-white'
                )}>
                  {lang.native}
                </p>
                <p className={cn(
                  'text-[13px] transition-colors duration-300',
                  isSelected ? 'text-black/50' : 'text-[#666]'
                )}>
                  {lang.english}
                </p>
              </div>

              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300',
                isSelected
                  ? 'bg-[#22C55E]'
                  : 'border border-[#333]'
              )}>
                {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={2.5} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default LanguageSettingsPage;
