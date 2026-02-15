import { useRef, useEffect, useState } from 'react';
import { X } from '../icons';

interface Props {
  targetRef: React.RefObject<HTMLElement | null>;
  title: string;
  description: string;
  position?: 'top' | 'bottom';
  onDismiss: () => void;
}

export function OnboardingTooltip({ targetRef, title, description, position = 'bottom', onDismiss }: Props) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (targetRef.current && tooltipRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      setCoords({
        top: position === 'bottom' ? rect.bottom + 12 : rect.top - tooltipRect.height - 12,
        left: Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipRect.width / 2, window.innerWidth - tooltipRect.width - 16)),
      });
    }
  }, [targetRef, position]);

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-black/60" onClick={onDismiss} />
      <div
        ref={tooltipRef}
        className="fixed z-[92] bg-white text-black rounded-2xl p-4 max-w-[280px] shadow-xl"
        style={{ top: coords.top, left: coords.left }}
      >
        <button onClick={onDismiss} className="absolute top-2 right-2 p-1">
          <X className="w-4 h-4 text-[#666]" />
        </button>
        <h3 className="font-semibold text-base mb-1 pr-6">{title}</h3>
        <p className="text-sm text-[#666] mb-3">{description}</p>
        <button onClick={onDismiss} className="w-full py-2 bg-black text-white rounded-xl text-sm font-medium">
          Got it
        </button>
      </div>
    </>
  );
}
