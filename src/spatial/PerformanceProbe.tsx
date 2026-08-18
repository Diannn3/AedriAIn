import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { renderPerformanceRuntime } from './performanceRuntime';

export function PerformanceProbe() {
  const { gl } = useThree();
  const elapsedRef = useRef(0);
  const framesRef = useRef(0);

  useFrame((_state, delta) => {
    elapsedRef.current += delta;
    framesRef.current += 1;
    if (elapsedRef.current < 0.5) return;
    const seconds = elapsedRef.current;
    const frames = framesRef.current;
    const fps = frames / seconds;
    renderPerformanceRuntime.getState().set(fps, (seconds * 1000) / Math.max(frames, 1), gl.getPixelRatio());
    elapsedRef.current = 0;
    framesRef.current = 0;
  });

  return null;
}
