import type * as THREE from 'three';

const targets = new Map<string, THREE.Object3D>();

export const registerSpatialTarget = (id: string, object: THREE.Object3D) => {
  object.userData.windowId = id;
  targets.set(id, object);
  return () => {
    if (targets.get(id) === object) targets.delete(id);
  };
};

export const getSpatialTargets = () => [...targets.entries()].map(([id, object]) => ({ id, object }));
export const getSpatialTarget = (id: string) => targets.get(id) ?? null;
export const clearSpatialTargets = () => targets.clear();
