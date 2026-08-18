import { Html } from '@react-three/drei';
import { Suspense, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useStore } from 'zustand';
import * as THREE from 'three';
import type { SpatialWindowModel } from '../core/types';
import { AppErrorBoundary } from '../apps/AppErrorBoundary';
import { apps } from '../apps/registry';
import { useDesktopStore } from '../store/useDesktopStore';
import { cameraFacingPlane, getSpatialCamera, intersectScreenPlane } from './cameraRuntime';
import { interactionRuntime } from './interactionRuntime';
import { registerSpatialTarget } from './targetRegistry';

const PIXELS_PER_WORLD_UNIT = 115;

interface MouseDragState {
  plane: THREE.Plane;
  offset: THREE.Vector3;
}

interface MouseResizeState {
  plane: THREE.Plane;
  startPoint: THREE.Vector3;
  startWidth: number;
  startHeight: number;
  rotationZ: number;
  scale: number;
  startPosition: THREE.Vector3;
}

export function SpatialWindow({ model }: { model: SpatialWindowModel }) {
  const chromeRef = useRef<THREE.Mesh>(null);
  const contentRef = useRef<THREE.Mesh>(null);
  const mouseDragRef = useRef<MouseDragState | null>(null);
  const mouseResizeRef = useRef<MouseResizeState | null>(null);
  const setTransform = useDesktopStore((state) => state.setWindowTransform);
  const setGeometry = useDesktopStore((state) => state.setWindowGeometry);
  const focus = useDesktopStore((state) => state.focusWindow);
  const close = useDesktopStore((state) => state.closeWindow);
  const minimize = useDesktopStore((state) => state.minimizeWindow);
  const toggleMaximize = useDesktopStore((state) => state.toggleMaximizeWindow);
  const hovered = useStore(interactionRuntime, (state) => state.hoveredWindowId === model.id);
  const active = useStore(interactionRuntime, (state) => state.activeWindowId === model.id);
  const hoveredRegion = useStore(interactionRuntime, (state) => state.hoveredWindowId === model.id ? state.hoveredRegion : null);
  const app = apps[model.appId];
  const AppComponent = app.Component;

  const headerWorldHeight = Math.min(0.52, model.height * 0.27);
  const contentWorldHeight = Math.max(0.4, model.height - headerWorldHeight);
  const headerY = model.height / 2 - headerWorldHeight / 2;
  const contentY = -headerWorldHeight / 2;

  useEffect(() => {
    const chrome = chromeRef.current;
    const content = contentRef.current;
    if (!chrome || !content) return;
    const unregisterChrome = registerSpatialTarget(model.id, 'chrome', chrome, 20);
    const unregisterContent = registerSpatialTarget(model.id, 'content', content, 10);
    return () => { unregisterChrome(); unregisterContent(); };
  }, [model.id]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const camera = getSpatialCamera();
      if (!camera) return;

      const drag = mouseDragRef.current;
      if (drag) {
        const point = intersectScreenPlane(camera, event.clientX, event.clientY, drag.plane);
        if (point) setTransform(model.id, { position: point.clone().add(drag.offset).toArray() as [number, number, number] });
        return;
      }

      const resize = mouseResizeRef.current;
      if (!resize) return;
      const point = intersectScreenPlane(camera, event.clientX, event.clientY, resize.plane);
      if (!point) return;
      const delta = point.clone().sub(resize.startPoint);
      const cos = Math.cos(-resize.rotationZ);
      const sin = Math.sin(-resize.rotationZ);
      const localX = (delta.x * cos - delta.y * sin) / Math.max(resize.scale, 0.001);
      const localY = (delta.x * sin + delta.y * cos) / Math.max(resize.scale, 0.001);
      const bounds = app.defaultWindow;
      const nextWidth = THREE.MathUtils.clamp(resize.startWidth + localX, bounds.minWidth, bounds.maxWidth);
      const nextHeight = THREE.MathUtils.clamp(resize.startHeight - localY, bounds.minHeight, bounds.maxHeight);
      const widthDelta = nextWidth - resize.startWidth;
      const heightDelta = nextHeight - resize.startHeight;
      const centerLocalX = widthDelta / 2;
      const centerLocalY = -heightDelta / 2;
      const worldShiftX = (centerLocalX * Math.cos(resize.rotationZ) - centerLocalY * Math.sin(resize.rotationZ)) * resize.scale;
      const worldShiftY = (centerLocalX * Math.sin(resize.rotationZ) + centerLocalY * Math.cos(resize.rotationZ)) * resize.scale;
      setGeometry(model.id, { width: nextWidth, height: nextHeight });
      setTransform(model.id, {
        position: [
          resize.startPosition.x + worldShiftX,
          resize.startPosition.y + worldShiftY,
          resize.startPosition.z,
        ],
      });
    };
    const up = () => {
      mouseDragRef.current = null;
      mouseResizeRef.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [model.id, setGeometry, setTransform]);

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
    mouseResizeRef.current = null;
    mouseDragRef.current = { plane, offset: anchor.clone().sub(point) };
  };

  const beginResize = (event: ReactPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    focus(model.id);
    const camera = getSpatialCamera();
    if (!camera) return;
    const anchor = new THREE.Vector3(...model.position);
    const plane = cameraFacingPlane(camera, anchor);
    const point = intersectScreenPlane(camera, event.clientX, event.clientY, plane);
    if (!point) return;
    mouseDragRef.current = null;
    mouseResizeRef.current = {
      plane,
      startPoint: point.clone(),
      startWidth: model.width,
      startHeight: model.height,
      rotationZ: model.rotationZ,
      scale: model.scale,
      startPosition: new THREE.Vector3(...model.position),
    };
  };

  const visualZ = model.position[2] + Math.min(model.zOrder, 1000) * 0.0006;
  const classes = [
    'spatial-window',
    model.focused ? 'spatial-window--focused' : '',
    hovered ? 'spatial-window--hovered' : '',
    active ? 'spatial-window--active' : '',
    hoveredRegion === 'content' ? 'spatial-window--content-hovered' : '',
    model.maximized ? 'spatial-window--maximized' : '',
    model.appId === 'document' ? 'spatial-window--document' : '',
  ].filter(Boolean).join(' ');

  const pixelWidth = Math.round(model.width * PIXELS_PER_WORLD_UNIT);
  const pixelHeight = Math.round(model.height * PIXELS_PER_WORLD_UNIT);

  return (
    <group position={[model.position[0], model.position[1], visualZ]} rotation={[0, 0, model.rotationZ]} scale={model.scale} renderOrder={model.zOrder}>
      <mesh ref={chromeRef} position={[0, headerY, -0.015]}>
        <planeGeometry args={[model.width, headerWorldHeight]} />
        <meshBasicMaterial side={THREE.DoubleSide} transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <mesh ref={contentRef} position={[0, contentY, -0.015]}>
        <planeGeometry args={[model.width, contentWorldHeight]} />
        <meshBasicMaterial side={THREE.DoubleSide} transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <Html transform center distanceFactor={5.7} zIndexRange={[2000 + model.zOrder, model.zOrder]}>
        <div
          className={classes}
          onPointerDown={() => focus(model.id)}
          data-window-id={model.id}
          style={{ width: pixelWidth, height: pixelHeight }}
        >
          <div className="window-scanline" />
          <header className="window-header" onPointerDown={beginDrag} onDoubleClick={(event) => { event.stopPropagation(); toggleMaximize(model.id); }}>
            <div className="window-title"><span className="window-icon">{app.icon}</span><div><b>{model.title}</b><small>{active ? 'SPATIAL GRAB ACTIVE' : hoveredRegion === 'content' ? 'CONTENT TARGET' : hovered ? 'WINDOW TARGET' : 'SPATIAL MODULE'}</small></div></div>
            <div className="window-actions">
              <button aria-label="Minimize" onClick={(event) => { event.stopPropagation(); minimize(model.id); }}>_</button>
              <button aria-label={model.maximized ? 'Restore' : 'Maximize'} onClick={(event) => { event.stopPropagation(); toggleMaximize(model.id); }}>{model.maximized ? '◇' : '□'}</button>
              <button aria-label="Shrink" onClick={(event) => { event.stopPropagation(); setTransform(model.id, { scale: model.scale - 0.08 }); }}>−</button>
              <button aria-label="Grow" onClick={(event) => { event.stopPropagation(); setTransform(model.id, { scale: model.scale + 0.08 }); }}>+</button>
              <button aria-label="Close" onClick={(event) => { event.stopPropagation(); close(model.id); }}>×</button>
            </div>
          </header>
          <section className="window-content" data-spatial-region="content">
            <AppErrorBoundary appTitle={app.title}>
              <Suspense fallback={<div className="app-loading">LOADING {app.title.toUpperCase()}…</div>}>
                <AppComponent windowId={model.id} resourceId={model.resourceId} />
              </Suspense>
            </AppErrorBoundary>
          </section>
          <footer className="window-footer"><span>HEADER PINCH · MOVE</span><span>2 HANDS · MOVE / SCALE / ROTATE</span></footer>
          <button className="window-resize-handle" aria-label="Resize window" onPointerDown={beginResize}>⌟</button>
        </div>
      </Html>
    </group>
  );
}
