import { useState, useEffect } from 'react';
import { ChevronRight } from '../icons';
import { Button } from '../ui/Button';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useTelegram } from '../../providers/TelegramProvider';
import { useTranslation } from '../../i18n';

const WelcomeIcon = () => (
  <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20">
    <rect x="10" y="10" width="60" height="60" rx="20" fill="#3390ec" fillOpacity="0.15"/>
    <path d="M40 20L43.5 33.5L57 37L43.5 40.5L40 54L36.5 40.5L23 37L36.5 33.5L40 20Z" fill="#3390ec"/>
    <circle cx="55" cy="25" r="4" fill="#3390ec" fillOpacity="0.6"/>
    <circle cx="25" cy="55" r="3" fill="#3390ec" fillOpacity="0.4"/>
  </svg>
);

const ExploreIcon = () => (
  <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20">
    <circle cx="40" cy="40" r="30" stroke="#22C55E" strokeWidth="3" fill="#22C55E" fillOpacity="0.1"/>
    <path d="M40 18V22M40 58V62M18 40H22M58 40H62" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"/>
    <polygon points="35,30 50,35 45,50 30,45" fill="#22C55E"/>
  </svg>
);

const DealIcon = () => (
  <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20">
    <rect x="10" y="25" width="25" height="30" rx="5" fill="#F59E0B" fillOpacity="0.2"/>
    <rect x="45" y="25" width="25" height="30" rx="5" fill="#F59E0B" fillOpacity="0.2"/>
    <path d="M25 40H55" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round"/>
    <circle cx="32" cy="40" r="6" fill="#F59E0B"/>
    <circle cx="48" cy="40" r="6" fill="#F59E0B"/>
  </svg>
);

const SecurityIcon = () => (
  <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20">
    <path d="M40 10L65 22V38C65 54 52 66 40 70C28 66 15 54 15 38V22L40 10Z" fill="white" fillOpacity="0.1" stroke="white" strokeWidth="2"/>
    <path d="M30 40L37 47L52 32" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SLIDE_ICONS = [WelcomeIcon, ExploreIcon, DealIcon, SecurityIcon];

export function WelcomeScreen() {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const { complete } = useOnboarding();
  const { hapticFeedback } = useTelegram();

  const SLIDES = [
    {
      icon: SLIDE_ICONS[0],
      title: t('onboarding.welcome'),
      description: t('onboarding.welcomeDesc'),
    },
    {
      icon: SLIDE_ICONS[1],
      title: t('onboarding.findChannels'),
      description: t('onboarding.findChannelsDesc'),
    },
    {
      icon: SLIDE_ICONS[2],
      title: t('onboarding.bookAds'),
      description: t('onboarding.bookAdsDesc'),
    },
    {
      icon: SLIDE_ICONS[3],
      title: t('onboarding.securePayments'),
      description: t('onboarding.securePaymentsDesc'),
    },
  ];

  useEffect(() => {
    const tabBar = document.querySelector('[data-tabbar]') as HTMLElement | null;
    if (tabBar) tabBar.style.display = 'none';
    return () => {
      if (tabBar) tabBar.style.display = 'flex';
    };
  }, []);

  const handleNext = () => {
    hapticFeedback('selection');
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      complete('welcomeScreenSeen');
    }
  };

  const slide = SLIDES[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <div
        className="absolute right-4 z-10"
        style={{ top: 'calc(var(--tg-content-safe-area-inset-top, 0px) + var(--tg-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 16px)' }}
      >
        <button
          onClick={() => complete('welcomeScreenSeen')}
          className="text-[#666] text-sm px-3 py-1.5 rounded-full bg-white/5 active:bg-white/10 transition-all"
        >
          {t('onboarding.skip')}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="mb-8">
          <Icon />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">{slide.title}</h1>
        <p className="text-[#999] text-base leading-relaxed max-w-xs">{slide.description}</p>
      </div>

      <div className="px-8" style={{ paddingBottom: 'calc(var(--tg-safe-area-bottom, env(safe-area-inset-bottom, 0px)) + 24px)' }}>
        <div className="flex justify-center gap-2 mb-6">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentSlide ? 'w-6 bg-white' : 'w-2 bg-[#333]'
              }`}
            />
          ))}
        </div>
        <Button className="w-full" size="lg" icon={ChevronRight} onClick={handleNext}>
          {currentSlide < SLIDES.length - 1 ? t('onboarding.next') : t('onboarding.getStarted')}
        </Button>
      </div>
    </div>
  );
}
