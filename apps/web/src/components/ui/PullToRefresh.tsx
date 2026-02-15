import { useState, useRef, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Loader2 } from '../icons';
import { cn } from '../../lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 60], [0, 1]);
  const scale = useTransform(y, [0, 60], [0.5, 1]);

  const threshold = 80;
  const maxPull = 120;

  const handleDragEnd = async () => {
    if (y.get() >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      animate(y, 60, { type: 'spring', stiffness: 400, damping: 30 });

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        animate(y, 0, { type: 'spring', stiffness: 400, damping: 30 });
      }
    } else {
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  };

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 top-0 z-10"
        style={{ y: useTransform(y, (v) => v - 40), opacity, scale }}
      >
        <div className="w-10 h-10 rounded-full bg-[#111111] border border-[#1A1A1A] flex items-center justify-center shadow-lg">
          <Loader2
            className={cn(
              'w-5 h-5 text-white',
              isRefreshing && 'animate-spin'
            )}
          />
        </div>
      </motion.div>

      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: maxPull }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={handleDragEnd}
        style={{ y }}
        className="touch-pan-x"
      >
        {children}
      </motion.div>
    </div>
  );
}
