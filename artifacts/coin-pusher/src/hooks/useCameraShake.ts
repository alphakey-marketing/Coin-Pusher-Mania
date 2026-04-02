import { useRef, useCallback } from 'react';

export function useCameraShake() {
  const shakeRef = useRef({ x: 0, y: 0, intensity: 0, decay: 0.85 });

  const shake = useCallback((intensity: number) => {
    shakeRef.current.intensity = Math.max(shakeRef.current.intensity, intensity);
  }, []);

  const update = useCallback((): { x: number; y: number } => {
    const s = shakeRef.current;
    if (s.intensity < 0.1) {
      s.intensity = 0;
      return { x: 0, y: 0 };
    }
    const x = (Math.random() - 0.5) * s.intensity * 2;
    const y = (Math.random() - 0.5) * s.intensity * 2;
    s.intensity *= s.decay;
    return { x, y };
  }, []);

  return { shake, update };
}
