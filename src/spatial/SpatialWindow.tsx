import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { SpatialWindowModel } from '../core/types';
import { apps } from '../modules/registry';
import { useDesktopStore } from '../store/useDesktopStore';
import { removeWindowRect, setWindowRect } from './windowRectRegistry';

export function SpatialWindow({ model }: { model: SpatialWindowModel }) {
  const domRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; position: [number, number, number] } | null>(null);
  const setTransform = useDesktopStore((s) => s.setWindowTransform);
  const focus = useDesktopStore((s) => s.focusWindow);
  const close = useDesktopStore((s) => s.closeWindow);
  const app = apps[model.appId];
  const frameRef = useRef(0);

  useFrame(() => {
    frameRef.current += 1;
    if (frameRef.current % 3 === 0 && domRef.current) setWindowRect(model.id, domRef.current.getBoundingClientRect());
  });

  useEffect(() => () => removeWindowRect(model.id), [model.id]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = event.clientX - dragRef.current.x;
      const dy = event.clientY - dragRef.current.y;
      setTransform(model.id, {
        position: [
          dragRef.current.position[0] + (dx / window.innerWidth) * 8.2,
          dragRef.current.position[1] - (dy / window.innerHeight) * 4.7,
          dragRef.current.position[2],
        ],
      });
    };
    const up = () => { dragRef.current = null; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [model.id, setTransform]);

  if (!model.open) return null;

  const beginDrag = (event: ReactPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    focus(model.id);
    dragRef.current = { x: event.clientX, y: event.clientY, position: [...model.position] };
  };

  return (
    <group position={model.position} rotation={[0, 0, model.rotationZ]} scale={model.scale} renderOrder={model.zOrder}>
      <Html transform center distanceFactor={5.7} zIndexRange={[2000 + model.zOrder, model.zOrder]}>
        <div ref={domRef} className={`spatial-window ${model.focused ? 'spatial-window--focused' : ''}`} onPointerDown={() => focus(model.id)}>
          <div className="window-scanline" />
          <header className="window-header" onPointerDown={beginDrag}>
            <div className="window-title"><span className="window-icon">{app.icon}</span><div><b>{model.title}</b><small>SPATIAL MODULE</small></div></div>
            <div className="window-actions">
              <button aria-label="Shrink" onClick={(e) => { e.stopPropagation(); setTransform(model.id, { scale: Math.max(0.65, model.scale - 0.08) }); }}>−</button>
              <button aria-label="Grow" onClick={(e) => { e.stopPropagation(); setTransform(model.id, { scale: Math.min(1.75, model.scale + 0.08) }); }}>+</button>
              <button aria-label="Close" onClick={(e) => { e.stopPropagation(); close(model.id); }}>×</button>
            </div>
          </header>
          <section className="window-content">{app.render()}</section>
          <footer className="window-footer"><span>PINCH + DRAG</span><span>2 HANDS · SCALE / ROTATE</span></footer>
        </div>
      </Html>
    </group>
  );
}
