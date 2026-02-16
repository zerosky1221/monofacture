import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from '../icons';
import { useBottomSheetDrag } from '../../hooks/useBottomSheetDrag';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
}

export function SelectSheet({ isOpen, onClose, title, options, value, onChange }: SelectSheetProps) {
  const { dragY, backdropOpacity, reset, scrollRef, handleProps, contentProps } =
    useBottomSheetDrag({ onClose });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      reset();
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, reset]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            <motion.div
              style={{ opacity: backdropOpacity }}
              className="w-full h-full bg-black/60"
              onClick={onClose}
            />
          </motion.div>

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0"
          >
            <motion.div
              style={{ y: dragY }}
              className="bg-[#111] rounded-t-3xl"
            >
              <div {...handleProps}>
                <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                  <div className="w-9 h-1 bg-[#333] rounded-full" />
                </div>

                <div className="flex items-center justify-between px-5 pb-3">
                  <h3 className="text-[17px] font-semibold text-white">{title}</h3>
                  <button
                    onClick={onClose}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="w-8 h-8 bg-[#333] rounded-full flex items-center justify-center"
                  >
                    <X size={14} className="text-white" />
                  </button>
                </div>
              </div>

              <div
                ref={scrollRef}
                {...contentProps}
                className="overflow-y-auto overscroll-contain"
                style={{ maxHeight: 'calc(60vh - 80px)', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}
              >
                {options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSelect(option.value)}
                      className={`w-full flex items-center justify-between px-5 h-[52px] transition-colors active:bg-white/[0.04] ${
                        isSelected ? 'bg-white/[0.06]' : ''
                      }`}
                    >
                      <span className={`text-[16px] ${isSelected ? 'text-white font-medium' : 'text-[#999]'}`}>
                        {option.label}
                      </span>
                      {isSelected && (
                        <Check className="w-5 h-5 text-[#3390ec]" strokeWidth={2} />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
