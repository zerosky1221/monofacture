import { useRef, useCallback } from 'react';
import { useMotionValue, useTransform, animate } from 'framer-motion';

interface UseBottomSheetDragOptions {
  onClose: () => void;
  dismissThreshold?: number;
  velocityThreshold?: number;
}

export function useBottomSheetDrag({
  onClose,
  dismissThreshold = 100,
  velocityThreshold = 500,
}: UseBottomSheetDragOptions) {
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 300], [1, 0]);

  const isDragging = useRef(false);
  const startY = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const velocityRef = useRef(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentDragging = useRef(false);
  const contentStartY = useRef(0);

  const reset = useCallback(() => {
    dragY.jump(0);
  }, [dragY]);

  const updateDrag = useCallback(
    (clientY: number) => {
      const now = performance.now();
      const dy = clientY - startY.current;
      dragY.set(Math.max(0, dy));

      const dt = (now - lastTime.current) / 1000;
      if (dt > 0) {
        velocityRef.current = (clientY - lastY.current) / dt;
      }
      lastY.current = clientY;
      lastTime.current = now;
    },
    [dragY],
  );

  const settle = useCallback(() => {
    const y = dragY.get();
    const v = velocityRef.current;
    if (y > dismissThreshold || v > velocityThreshold) {
      animate(dragY, window.innerHeight, {
        type: 'spring',
        damping: 40,
        stiffness: 400,
        velocity: v,
      });
      setTimeout(onClose, 120);
    } else {
      animate(dragY, 0, { type: 'spring', damping: 25, stiffness: 350 });
    }
  }, [dragY, onClose, dismissThreshold, velocityThreshold]);

  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      startY.current = e.clientY;
      lastY.current = e.clientY;
      lastTime.current = performance.now();
      velocityRef.current = 0;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const onHandlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      updateDrag(e.clientY);
    },
    [updateDrag],
  );

  const onHandlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    settle();
  }, [settle]);

  const onContentTouchStart = useCallback((e: React.TouchEvent) => {
    contentStartY.current = e.touches[0].clientY;
    contentDragging.current = false;
    lastY.current = e.touches[0].clientY;
    lastTime.current = performance.now();
    velocityRef.current = 0;
  }, []);

  const onContentTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const scrollEl = scrollRef.current;
      if (!scrollEl) return;
      const clientY = e.touches[0].clientY;
      const diff = clientY - contentStartY.current;

      if (!contentDragging.current && scrollEl.scrollTop <= 0 && diff > 8) {
        contentDragging.current = true;
        startY.current = clientY;
        lastY.current = clientY;
        lastTime.current = performance.now();
      }

      if (contentDragging.current) {
        e.preventDefault();
        updateDrag(clientY);
      }
    },
    [updateDrag],
  );

  const onContentTouchEnd = useCallback(() => {
    if (contentDragging.current) {
      contentDragging.current = false;
      settle();
    }
  }, [settle]);

  return {
    dragY,
    backdropOpacity,
    reset,
    scrollRef,
    handleProps: {
      onPointerDown: onHandlePointerDown,
      onPointerMove: onHandlePointerMove,
      onPointerUp: onHandlePointerUp,
      onPointerCancel: onHandlePointerUp,
      style: { touchAction: 'none' as const },
    },
    contentProps: {
      onTouchStart: onContentTouchStart,
      onTouchMove: onContentTouchMove,
      onTouchEnd: onContentTouchEnd,
    },
  };
}
