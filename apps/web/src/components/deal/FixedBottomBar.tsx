import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { slideUpVariants } from './animations';

interface FixedBottomBarProps {
  children: ReactNode;
  show: boolean;
}

export function FixedBottomBar({ children, show }: FixedBottomBarProps) {
  if (!show) return null;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          variants={slideUpVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed bottom-0 left-0 right-0 z-50"
        >
          <div className="bg-black/90 border-t border-white/10">
            <div
              className="px-4 py-3"
              style={{
                paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
              }}
            >
              {children}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

interface GradientButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: ReactNode;
}

export function GradientButton({ onClick, disabled, loading, children }: GradientButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full py-4 rounded-2xl font-semibold text-lg bg-white text-black disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] transition-all"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
          Processing...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export default FixedBottomBar;
