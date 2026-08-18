import { Html } from '@react-three/drei';
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useStore } from 'zustand';
import * as THREE from 'three';
import type { SpatialWindowModel } from '../core/types';
import { apps } from '../apps/registry';
import { useDesktopStore } from '../store/useDesktopStore';
import { cameraFacingPlane, getSpatialCamera, intersectScreenPlane } from './cameraRuntime';
import { interactionRuntime } from './interactionRuntime';
import { registerSpatialTarget } from './targetRegistry';

interface MouseDragState {
  plane: THREE.Plane;
  offset: THREE.Vector3;
}

export function SpatialWindow({ model }: { model: SpatialWindowModel }) {
  const interactionRef = useRef<THREE.Mesh>(null);
  const mouseDragRef = useRef<MouseDragState | null>(null);
  const setTransform = useDesktopStore((state) => state.setWindowTransform);
  const focus = useDesktopStore((state) => state.focusWindow);
  const close = useDesktopStore((state) => state.closeWindow);
  const minimize = useDesktopStore((state) => state.minimizeWindow);
  const toggleMaximize = useDesktopStore((state) => state.toggleMaximizeWindow);
  const hovered = useStore(interactionRuntime, (state) => state.hoveredWindowId === model.id);
  const active = useStore(interactionRuntime, (state) => state.activeWindowId === model.id);
  const app = apps[model.appId];

  useEffect(() => {
    const object = interactionRef.current;
    if (!object) return;
    object.userData.windowId = model.id;
    return registerSpatialTarget(model.id, object);
  }, [model.id]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const drag = mouseDragRef.current;
      const camera = getSpatialCamera();
      if (!drag || !camera) return;
      const point = intersectScreenPlane(camera, event.clientX, event.clientY, drag.plane);
      if (!point) return;
      setTransform(model.id, { position: point.clone().add(drag.offset).toArray() as [number, number, number] });
    };
    const up = () => { mouseDragRef.current = null; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [model.id, setTransform]);

  if (!model.open || model.minimized) return null;

  const beginDrag = (event: ReactPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    focus(model.id);
    const camera = getSpatialCamera();
    if (!camera) return;
    const anchor = new THREE.Vector3(...model.position);
    const plane = cameraFacingPlane(camera, anchor);
    const point = intersectScreenPlane(camera, event.clientX, event.clientY, plane);
    if (!point) return;
    mouseDragRef.current = { plane, offset: anchor.clone().sub(point) };
  };

  const visualZ = model.position[2] + Math.min(model.zOrder, 1000) * 0.0006;
  const classes = [
    'spatial-window',
    model.focused ? 'spatial-window--focused' : '',
    hovered ? 'spatial-window--hovered' : '',
    active ? 'spatial-window--active' : '',
    model.maximized ? 'spatial-window--maximized' : '',
  ].filter(Boolean).join(' ');

  return (
    <group position={[model.position[0], model.position[1], visualZ]} rotation={[0, 0, model.rotationZ]} scale={model.scale} renderOrder={model.zOrder}>
      <mesh ref={interactionRef} position={[0, 0, -0.015]}>
        <planeGeometry args={[3.05, 2.12]} />
        <meshBasicMaterial side={THREE.DoubleSide} transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <Html transform center distanceFactor={5.7} zIndexRange={[2000 + model.zOrder, model.zOrder]}>
        <div className={classes} onPointerDown={() => focus(model.id)}>
          <div className="window-scanline" />
          <header className="window-header" onPointerDown={beginDrag} onDoubleClick={(event) => { event.stopPropagation(); toggleMaximize(model.id); }}>
            <div className="window-title"><span className="window-icon">{app.icon}</span><div><b>{model.title}</b><small>{active ? 'SPATIAL GRAB ACTIVE' : hovered ? 'SPATIAL TARGET' : 'SPATIAL MODULE'}</small></div></div>
            <div className="window-actions">
              <button aria-label="Minimize" onClick={(event) => { event.stopPropagation(); minimize(model.id); }}>_</button>
              <button aria-label={model.maximized ? 'Restore' : 'Maximize'} onClick={(event) => { event.stopPropagation(); toggleMaximize(model.id); }}>{model.maximized ? '◇' : '□'}</button>
              <button aria-label="Shrink" onClick={(event) => { event.stopPropagation(); setTransform(model.id, { scale: Math.max(0.55, model.scale - 0.08) }); }}>−</button>
              <button aria-label="Grow" onClick={(event) => { event.stopPropagation(); setTransform(model.id, { scale: Math.min(1.85, model.scale + 0.08) }); }}>+</button>
              <button aria-label="Close" onClick={(event) => { event.stopPropagation(); close(model.id); }}>×</button>
            </div>
          </header>
          <section className="window-content">{app.render()}</section>
          <footer className="window-footer"><span>RAY + PINCH · MOVE</span><span>2 HANDS · MOVE / SCALE / ROTATE</span></footer>
        </div>
      </Html>
    </group>
  );
}
