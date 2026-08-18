import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { handRuntime } from '../input/hand/handRuntime';
import { useDesktopStore } from '../store/useDesktopStore';
import { cameraFacingPlane, fallbackPointerPoint, normalizedHandToNdc, setSpatialRuntime } from './cameraRuntime';
import { interactionRuntime } from './interactionRuntime';
import { getSpatialTargets, type SpatialTarget } from './targetRegistry';
import { choosePrimaryHand } from './handSelection';
import { gestureProfileRuntime } from '../input/hand/gestureProfileRuntime';
import { activateSpatialContentControl } from './domContentInteraction';

interface GrabState {
  id: string;
  handId: string;
  plane: THREE.Plane;
  offset: THREE.Vector3;
}

interface TransformState {
  id: string;
  handIds: [string, string];
  plane: THREE.Plane;
  offset: THREE.Vector3;
  startDistance: number;
  startAngle: number;
  startScale: number;
  startRotation: number;
}

interface SpatialHit {
  hit: THREE.Intersection;
  target: SpatialTarget;
  zOrder: number;
}

const DEPTH_PRIORITY_EPSILON = 0.08;
const pickRaycaster = new THREE.Raycaster();
const moveRaycaster = new THREE.Raycaster();
const tempPoint = new THREE.Vector3();
const fallbackPoint = new THREE.Vector3();

function raycastWindow(ndc: THREE.Vector2, camera: THREE.Camera): SpatialHit | null {
  const targets = getSpatialTargets();
  if (!targets.length) return null;
  pickRaycaster.setFromCamera(ndc, camera);
  const objectToTarget = new Map(targets.map((target) => [target.object.uuid, target]));
  const desktop = useDesktopStore.getState();
  const candidates = pickRaycaster.intersectObjects(targets.map(({ object }) => object), false)
    .map((hit) => ({ hit, target: objectToTarget.get(hit.object.uuid) }))
    .filter((item): item is { hit: THREE.Intersection; target: SpatialTarget } => Boolean(item.target))
    .map((item) => ({
      ...item,
      zOrder: desktop.windows.find((windowModel) => windowModel.id === item.target.windowId)?.zOrder ?? 0,
    }));

  candidates.sort((a, b) => {
    const distanceDelta = a.hit.distance - b.hit.distance;
    if (Math.abs(distanceDelta) > DEPTH_PRIORITY_EPSILON) return distanceDelta;
    if (a.target.windowId === b.target.windowId && a.target.priority !== b.target.priority) return b.target.priority - a.target.priority;
    return b.zOrder - a.zOrder || distanceDelta;
  });
  return candidates[0] ?? null;
}

function pointerWorldForNdc(camera: THREE.Camera, ndc: THREE.Vector2, hitPoint?: THREE.Vector3) {
  if (hitPoint) return hitPoint.toArray() as [number, number, number];
  const fallback = fallbackPointerPoint(camera, ndc, fallbackPoint);
  return fallback ? fallback.toArray() as [number, number, number] : null;
}

export function HandInteractionController() {
  const { camera, gl } = useThree();
  const grabRef = useRef<GrabState | null>(null);
  const transformRef = useRef<TransformState | null>(null);
  const previousPinchesRef = useRef(new Set<string>());
  const ndcA = useMemo(() => new THREE.Vector2(), []);
  const ndcB = useMemo(() => new THREE.Vector2(), []);
  const midpointNdc = useMemo(() => new THREE.Vector2(), []);

  useEffect(() => {
    setSpatialRuntime(camera, gl.domElement);
    return () => {
      setSpatialRuntime(null, null);
      interactionRuntime.getState().reset();
    };
  }, [camera, gl.domElement]);

  useFrame(() => {
    const handState = handRuntime.getState();
    const desktop = useDesktopStore.getState();
    const hands = handState.hands;
    const pinching = hands.filter((hand) => hand.pinching);
    const pinchingIds = new Set(pinching.map((hand) => hand.id));
    const preferredHand = gestureProfileRuntime.getState().profile.preferredHand;

    if (!hands.length) {
      grabRef.current = null;
      transformRef.current = null;
      previousPinchesRef.current.clear();
      interactionRuntime.getState().reset();
      return;
    }

    if (transformRef.current) {
      const tx = transformRef.current;
      const a = hands.find((hand) => hand.id === tx.handIds[0] && hand.pinching);
      const b = hands.find((hand) => hand.id === tx.handIds[1] && hand.pinching);
      if (a && b) {
        ndcA.copy(normalizedHandToNdc(a.pinchPoint.x, a.pinchPoint.y));
        ndcB.copy(normalizedHandToNdc(b.pinchPoint.x, b.pinchPoint.y));
        const distance = Math.max(ndcA.distanceTo(ndcB), 0.04);
        const angle = Math.atan2(ndcB.y - ndcA.y, ndcB.x - ndcA.x);
        midpointNdc.set((ndcA.x + ndcB.x) / 2, (ndcA.y + ndcB.y) / 2);
        moveRaycaster.setFromCamera(midpointNdc, camera);
        const point = moveRaycaster.ray.intersectPlane(tx.plane, tempPoint);
        desktop.setWindowTransform(tx.id, {
          ...(point ? { position: point.clone().add(tx.offset).toArray() as [number, number, number] } : {}),
          scale: tx.startScale * (distance / tx.startDistance),
          rotationZ: tx.startRotation + (angle - tx.startAngle),
        });
        interactionRuntime.getState().setState({
          hoveredWindowId: tx.id,
          hoveredRegion: 'chrome',
          activeWindowId: tx.id,
          primaryHandId: a.id,
          activeHandIds: [a.id, b.id],
          pointerWorld: pointerWorldForNdc(camera, midpointNdc, point ?? undefined),
          mode: 'transform',
        });
        previousPinchesRef.current = pinchingIds;
        return;
      }

      const remaining = hands.find((hand) => tx.handIds.includes(hand.id) && hand.pinching);
      if (remaining) {
        const model = desktop.windows.find((windowModel) => windowModel.id === tx.id && windowModel.open && !windowModel.minimized);
        if (model) {
          const anchor = new THREE.Vector3(...model.position);
          const plane = cameraFacingPlane(camera, anchor);
          ndcA.copy(normalizedHandToNdc(remaining.pinchPoint.x, remaining.pinchPoint.y));
          moveRaycaster.setFromCamera(ndcA, camera);
          const point = moveRaycaster.ray.intersectPlane(plane, tempPoint);
          grabRef.current = { id: tx.id, handId: remaining.id, plane, offset: point ? anchor.clone().sub(point) : new THREE.Vector3() };
        }
      }
      transformRef.current = null;
    }

    if (pinching.length >= 2) {
      const grabOwner = grabRef.current ? pinching.find((hand) => hand.id === grabRef.current?.handId) : null;
      const a = grabOwner ?? choosePrimaryHand(pinching, null, preferredHand) ?? pinching[0];
      const b = pinching.find((hand) => hand.id !== a.id) ?? pinching[1];
      ndcA.copy(normalizedHandToNdc(a.pinchPoint.x, a.pinchPoint.y));
      ndcB.copy(normalizedHandToNdc(b.pinchPoint.x, b.pinchPoint.y));
      midpointNdc.set((ndcA.x + ndcB.x) / 2, (ndcA.y + ndcB.y) / 2);

      const hitA = raycastWindow(ndcA, camera);
      const hitB = raycastWindow(ndcB, camera);
      const midHit = raycastWindow(midpointNdc, camera);
      const sameWindowId = hitA && hitB && hitA.target.windowId === hitB.target.windowId ? hitA.target.windowId : null;
      const id = grabRef.current?.id ?? sameWindowId ?? midHit?.target.windowId ?? null;
      const model = id ? desktop.windows.find((windowModel) => windowModel.id === id && windowModel.open && !windowModel.minimized) : null;

      if (id && model) {
        desktop.focusWindow(id);
        const distance = Math.max(ndcA.distanceTo(ndcB), 0.04);
        const angle = Math.atan2(ndcB.y - ndcA.y, ndcB.x - ndcA.x);
        const anchor = new THREE.Vector3(...model.position);
        const plane = cameraFacingPlane(camera, anchor);
        moveRaycaster.setFromCamera(midpointNdc, camera);
        const point = moveRaycaster.ray.intersectPlane(plane, tempPoint);
        transformRef.current = {
          id,
          handIds: [a.id, b.id],
          plane,
          offset: point ? anchor.clone().sub(point) : new THREE.Vector3(),
          startDistance: distance,
          startAngle: angle,
          startScale: model.scale,
          startRotation: model.rotationZ,
        };
        grabRef.current = null;
        interactionRuntime.getState().setState({
          hoveredWindowId: id,
          hoveredRegion: 'chrome',
          activeWindowId: id,
          primaryHandId: a.id,
          activeHandIds: [a.id, b.id],
          pointerWorld: pointerWorldForNdc(camera, midpointNdc, point ?? midHit?.hit.point),
          mode: 'transform',
        });
        previousPinchesRef.current = pinchingIds;
        return;
      }
    }

    const primary = choosePrimaryHand(hands, grabRef.current?.handId ?? interactionRuntime.getState().primaryHandId, preferredHand);
    if (!primary) {
      previousPinchesRef.current = pinchingIds;
      interactionRuntime.getState().reset();
      return;
    }

    ndcA.copy(normalizedHandToNdc(primary.pointer.x, primary.pointer.y));
    const hover = raycastWindow(ndcA, camera);

    if (primary.pinching) {
      const isPinchStart = !previousPinchesRef.current.has(primary.id);
      if (!grabRef.current && isPinchStart) {
        ndcA.copy(normalizedHandToNdc(primary.pinchPoint.x, primary.pinchPoint.y));
        const hit = raycastWindow(ndcA, camera);
        const model = hit ? desktop.windows.find((windowModel) => windowModel.id === hit.target.windowId && windowModel.open && !windowModel.minimized) : null;
        if (hit?.target.region === 'chrome' && model) {
          desktop.focusWindow(hit.target.windowId);
          const anchor = new THREE.Vector3(...model.position);
          const plane = cameraFacingPlane(camera, hit.hit.point);
          grabRef.current = { id: hit.target.windowId, handId: primary.id, plane, offset: anchor.clone().sub(hit.hit.point) };
        } else if (hit?.target.region === 'content' && model) {
          desktop.focusWindow(hit.target.windowId);
          activateSpatialContentControl(hit.target.windowId, primary.pinchPoint.x, primary.pinchPoint.y);
        }
      }

      if (grabRef.current?.handId === primary.id) {
        ndcA.copy(normalizedHandToNdc(primary.pinchPoint.x, primary.pinchPoint.y));
        moveRaycaster.setFromCamera(ndcA, camera);
        const point = moveRaycaster.ray.intersectPlane(grabRef.current.plane, tempPoint);
        if (point) desktop.setWindowTransform(grabRef.current.id, { position: point.clone().add(grabRef.current.offset).toArray() as [number, number, number] });
      }
    } else if (grabRef.current?.handId === primary.id) {
      grabRef.current = null;
    }

    if (primary.gesture === 'FIST' && hover?.target.windowId && !grabRef.current) {
      const model = desktop.windows.find((windowModel) => windowModel.id === hover.target.windowId && windowModel.open && !windowModel.minimized);
      if (model?.focused && Math.abs(model.rotationZ) > 0.002) desktop.setWindowTransform(model.id, { rotationZ: 0 });
    }

    const activeId = grabRef.current?.id ?? null;
    const pointerHit = activeId ? (() => {
      const target = getSpatialTargets().find((entry) => entry.windowId === activeId && entry.region === 'chrome')?.object;
      if (!target) return undefined;
      pickRaycaster.setFromCamera(ndcA, camera);
      return pickRaycaster.intersectObject(target, false)[0]?.point;
    })() : hover?.hit.point;

    const contentPinch = !activeId && primary.pinching && hover?.target.region === 'content';
    interactionRuntime.getState().setState({
      hoveredWindowId: activeId ?? hover?.target.windowId ?? null,
      hoveredRegion: activeId ? 'chrome' : hover?.target.region ?? null,
      activeWindowId: activeId,
      primaryHandId: primary.id,
      activeHandIds: activeId ? [primary.id] : [],
      pointerWorld: pointerWorldForNdc(camera, ndcA, pointerHit),
      mode: activeId ? 'grab' : contentPinch ? 'content' : hover ? 'hover' : 'idle',
    });
    previousPinchesRef.current = pinchingIds;
  });

  return null;
}
