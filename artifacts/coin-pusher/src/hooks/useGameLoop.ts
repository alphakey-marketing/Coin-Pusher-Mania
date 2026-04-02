import { useEffect, useRef, useCallback } from 'react';

export function useGameLoop(callback: (dt: number) => void, active: boolean) {
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const loop = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const dt = Math.min(time - lastTimeRef.current, 50);
      lastTimeRef.current = time;
      callbackRef.current(dt);
      rafRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);
}
