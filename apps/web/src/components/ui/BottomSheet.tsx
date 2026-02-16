import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from '../icons';
import { useBottomSheetDrag } from '../../hooks/useBottomSheetDrag';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  showHandle?: boolean;
  showCloseButton?: boolean;
  height?: 'auto' | 'half' | 'full';
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  showHandle = true,
  showCloseButton = false,
  height = 'auto',
}: BottomSheetProps) {
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

  const heightClass = {
    auto: 'max-h-[85vh]',
    half: 'h-[50vh]',
    full: 'h-[90vh]',
  }[height];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sheet-backdrop"
            style={{ background: 'transparent' }}
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
            className={`bottom-sheet ${heightClass}`}
            style={{ background: 'transparent', border: 'none' }}
          >
            <motion.div
              style={{ y: dragY }}
              className="bg-[#111] rounded-t-3xl border-t border-[#1F1F1F] h-full flex flex-col"
            >
              <div {...handleProps}>
                {showHandle && (
                  <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                    <div className="w-9 h-1 bg-[#333] rounded-full" />
                  </div>
                )}

                {(title || showCloseButton) && (
                  <div className="flex items-center justify-between px-4 pb-4">
                    {title && (
                      <h2 className="text-lg font-semibold text-white">{title}</h2>
                    )}
                    {showCloseButton && (
                      <button
                        onClick={onClose}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="p-2 -mr-2 text-[#999] hover:text-white transition-all duration-200"
                      >
                        <X size={24} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div
                ref={scrollRef}
                {...contentProps}
                className="overflow-y-auto overscroll-contain px-4 pb-8 flex-1"
              >
                {children}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
