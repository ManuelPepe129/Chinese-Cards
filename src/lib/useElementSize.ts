import { useEffect, useState } from 'react';
import type { Box } from './strokeLayout';

/** Attach the returned callback ref to an element to track its size (re-measured on resize). */
export function useElementSize<T extends HTMLElement>(): [(el: T | null) => void, Box] {
  const [el, setEl] = useState<T | null>(null);
  const [size, setSize] = useState<Box>({ w: 0, h: 0 });
  useEffect(() => {
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, size];
}
