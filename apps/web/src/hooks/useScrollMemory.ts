import { useEffect, useRef, useCallback } from 'react';

const scrollPositions = new Map<string, number>();

export function useScrollMemory(key: string, scrollRef?: React.RefObject<HTMLElement | null>) {
  const savedKey = useRef(key);
  savedKey.current = key;

  const getScrollTop = useCallback(() => {
    if (scrollRef?.current) return scrollRef.current.scrollTop;
    return window.scrollY || document.documentElement.scrollTop;
  }, [scrollRef]);

  const setScrollTop = useCallback((pos: number) => {
    if (scrollRef?.current) {
      scrollRef.current.scrollTop = pos;
    } else {
      window.scrollTo(0, pos);
    }
  }, [scrollRef]);

  const savePosition = useCallback(() => {
    const pos = getScrollTop();
    scrollPositions.set(savedKey.current, pos);
  }, [getScrollTop]);

  useEffect(() => {
    const pos = scrollPositions.get(key);
    if (pos !== undefined) {
      requestAnimationFrame(() => {
        setScrollTop(pos);
      });
    }

    return () => {
      const currentPos = getScrollTop();
      scrollPositions.set(key, currentPos);
    };
  }, [key, setScrollTop, getScrollTop]);

  return { savePosition };
}
