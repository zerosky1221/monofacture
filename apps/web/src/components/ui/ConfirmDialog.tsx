import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmDialogProps {
  active: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  active,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [active]);

  const isDanger = variant === 'danger';

  return (
    <AnimatePresence>
      {active && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[9999] flex items-center justify-center px-6"
          onClick={(e) => { if (e.target === overlayRef.current) onCancel(); }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-[320px] bg-[#111] border border-[#1F1F1F] rounded-2xl overflow-hidden"
          >
            <div className="p-5 pb-4">
              <h3 className="text-[15px] font-semibold text-white mb-1.5">{title}</h3>
              <p className="text-[13px] text-[#999] leading-relaxed">{description}</p>
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl text-[14px] font-medium bg-[#1A1A1A] text-[#999] border border-[#1F1F1F] transition-all active:scale-[0.97]"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium transition-all active:scale-[0.97] ${
                  isDanger
                    ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/20'
                    : 'bg-white text-black'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
