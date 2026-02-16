import { useState } from 'react';
import { X, Handshake, CreditCard, Pen, CheckCircle } from '../icons';
import { useTranslation } from '../../i18n';

const STORAGE_KEY = 'monofacture_deal_tutorial_seen';

const SLIDE_ICONS = [Handshake, CreditCard, Pen, CheckCircle];

export function DealTutorial() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem(STORAGE_KEY) === 'true'
  );
  const [currentSlide, setCurrentSlide] = useState(0);

  const SLIDES = [
    {
      icon: SLIDE_ICONS[0],
      title: t('tutorial.slide1Title'),
      description: t('tutorial.slide1Desc'),
    },
    {
      icon: SLIDE_ICONS[1],
      title: t('tutorial.slide2Title'),
      description: t('tutorial.slide2Desc'),
    },
    {
      icon: SLIDE_ICONS[2],
      title: t('tutorial.slide3Title'),
      description: t('tutorial.slide3Desc'),
    },
    {
      icon: SLIDE_ICONS[3],
      title: t('tutorial.slide4Title'),
      description: t('tutorial.slide4Desc'),
    },
  ];

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleDismiss();
    }
  };

  const slide = SLIDES[currentSlide];
  const Icon = slide.icon;
  const isLast = currentSlide === SLIDES.length - 1;

  return (
    <div className="mx-4 mb-4 bg-[#111] border border-[#1A1A1A] rounded-2xl p-5 relative overflow-hidden">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-[#666] hover:text-white transition-colors"
        aria-label="Dismiss tutorial"
      >
        <X className="w-4 h-4" strokeWidth={2} />
      </button>

      <div className="w-12 h-12 rounded-2xl bg-[#3390ec]/12 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-[#3390ec]" strokeWidth={1.5} />
      </div>

      <h3 className="text-[15px] font-semibold text-white mb-1">{slide.title}</h3>
      <p className="text-[13px] text-[#999] leading-relaxed mb-4">{slide.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === currentSlide ? 'w-4 bg-[#3390ec]' : 'bg-[#333]'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="px-4 py-1.5 bg-[#3390ec] text-white text-[13px] font-medium rounded-xl active:scale-[0.97] transition-all"
        >
          {isLast ? t('tutorial.gotIt') : t('common.next')}
        </button>
      </div>
    </div>
  );
}
